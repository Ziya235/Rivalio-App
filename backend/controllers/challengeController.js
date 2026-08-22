import { prisma } from "../config/db.js";
import { parsePositiveInt, teamSelect, userBriefSelect } from "../utils/helpers.js";
import { expirePastListings } from "../utils/expireListings.js";

const challengeInclude = {
  team: {
    select: {
      ...teamSelect,
      captain: { select: userBriefSelect },
    },
  },
  acceptedTeam: { select: teamSelect },
  createdBy: { select: userBriefSelect },
  requests: {
    include: {
      team: { select: teamSelect },
      requestedBy: { select: userBriefSelect },
    },
    orderBy: { createdAt: "desc" },
  },
  match: {
    select: {
      id: true,
      scheduledAt: true,
      venue: true,
      status: true,
      homeTeamId: true,
      awayTeamId: true,
    },
  },
};

const assertCaptainOf = async (userId, teamId) => {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, captainId: true, name: true },
  });
  if (!team) return { error: { status: 404, message: "Team not found" } };
  if (team.captainId !== userId) {
    return { error: { status: 403, message: "Only the team captain can do this" } };
  }
  return { team };
};

export const createChallenge = async (req, res) => {
  try {
    await expirePastListings();

    const { teamId, scheduledAt, venue, notes } = req.body;
    const tid = parsePositiveInt(teamId);

    if (!tid) {
      return res.status(400).json({
        success: false,
        message: "teamId is required",
      });
    }

    if (!scheduledAt || Number.isNaN(Date.parse(scheduledAt))) {
      return res.status(400).json({
        success: false,
        message: "Valid scheduledAt is required",
      });
    }

    if (!venue?.trim()) {
      return res.status(400).json({
        success: false,
        message: "venue is required",
      });
    }

    const when = new Date(scheduledAt);
    const minWhen = new Date(Date.now() + 60 * 60 * 1000);
    if (when < minWhen) {
      return res.status(400).json({
        success: false,
        message: "Matç ən azı 1 saat sonra yaradıla bilər",
      });
    }

    const { team, error } = await assertCaptainOf(req.user.id, tid);
    if (error) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    const challenge = await prisma.challenge.create({
      data: {
        teamId: team.id,
        createdById: req.user.id,
        scheduledAt: when,
        venue: venue.trim(),
        notes: notes?.trim() || null,
      },
      include: challengeInclude,
    });

    return res.status(201).json({
      success: true,
      message: "Challenge posted",
      data: challenge,
    });
  } catch (error) {
    console.log("Error in createChallenge:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const listChallenges = async (req, res) => {
  try {
    await expirePastListings();
    const uid = req.user.id;

    const challenges = await prisma.challenge.findMany({
      where: {
        scheduledAt: { gt: new Date() },
        OR: [
          { status: "OPEN" },
          {
            status: "ACCEPTED",
            OR: [
              { createdById: uid },
              { team: { captainId: uid } },
              { acceptedTeam: { captainId: uid } },
              { team: { players: { some: { userId: uid } } } },
              { acceptedTeam: { players: { some: { userId: uid } } } },
            ],
          },
        ],
      },
      include: challengeInclude,
      orderBy: { scheduledAt: "asc" },
    });

    const ids = challenges.map((c) => c.id);
    const myRequests =
      ids.length === 0
        ? []
        : await prisma.challengeRequest.findMany({
            where: {
              challengeId: { in: ids },
              team: { captainId: uid },
            },
            select: {
              id: true,
              status: true,
              challengeId: true,
              teamId: true,
            },
            orderBy: { createdAt: "desc" },
          });

    const rank = (status) =>
      status === "PENDING" ? 3 : status === "ACCEPTED" ? 2 : 1;
    const myByChallenge = new Map();
    for (const r of myRequests) {
      const prev = myByChallenge.get(r.challengeId);
      if (!prev || rank(r.status) > rank(prev.status)) {
        myByChallenge.set(r.challengeId, {
          id: r.id,
          status: r.status,
          teamId: r.teamId,
        });
      }
    }

    const data = challenges.map((c) => ({
      ...c,
      myRequest: myByChallenge.get(c.id) ?? null,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.log("Error in listChallenges:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const requestChallenge = async (req, res) => {
  try {
    await expirePastListings();

    const challengeId = parsePositiveInt(req.params.challengeId);
    const { teamId, message } = req.body;
    const tid = parsePositiveInt(teamId);

    if (!challengeId || !tid) {
      return res.status(400).json({
        success: false,
        message: "challengeId and teamId are required",
      });
    }

    const { team, error } = await assertCaptainOf(req.user.id, tid);
    if (error) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge || challenge.status !== "OPEN") {
      return res.status(404).json({
        success: false,
        message: "Open challenge not found",
      });
    }

    if (challenge.teamId === tid) {
      return res.status(400).json({
        success: false,
        message: "Cannot challenge your own team",
      });
    }

    if (challenge.scheduledAt <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Challenge has expired",
      });
    }

    const alreadyPending = await prisma.challengeRequest.findFirst({
      where: {
        challengeId,
        status: "PENDING",
        team: { captainId: req.user.id },
      },
    });

    if (alreadyPending) {
      return res.status(409).json({
        success: false,
        message: "Sorğu artıq göndərilib və gözləyir",
      });
    }

    const existing = await prisma.challengeRequest.findUnique({
      where: {
        challengeId_teamId: { challengeId, teamId: tid },
      },
    });

    if (existing?.status === "ACCEPTED") {
      return res.status(400).json({
        success: false,
        message: "Bu challenge üçün artıq qəbul olunmusunuz",
      });
    }

    const include = {
      team: { select: teamSelect },
      requestedBy: { select: userBriefSelect },
      challenge: { include: challengeInclude },
    };

    const request = existing
      ? await prisma.challengeRequest.update({
          where: { id: existing.id },
          data: {
            status: "PENDING",
            message: message?.trim() || null,
            requestedById: req.user.id,
            respondedAt: null,
            createdAt: new Date(),
          },
          include,
        })
      : await prisma.challengeRequest.create({
          data: {
            challengeId,
            teamId: tid,
            requestedById: req.user.id,
            message: message?.trim() || null,
          },
          include,
        });

    return res.status(201).json({
      success: true,
      message: "Challenge request sent",
      data: request,
    });
  } catch (error) {
    console.log("Error in requestChallenge:", error);
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Your team already requested this challenge",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const listMyChallengeNotifications = async (req, res) => {
  try {
    await expirePastListings();
    const now = new Date();

    const [incoming, outcomes] = await Promise.all([
      prisma.challengeRequest.findMany({
        where: {
          challenge: {
            team: { captainId: req.user.id },
            scheduledAt: { gt: now },
          },
        },
        include: {
          team: { select: teamSelect },
          requestedBy: { select: userBriefSelect },
          challenge: {
            include: {
              team: { select: teamSelect },
              acceptedTeam: { select: teamSelect },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.challengeRequest.findMany({
        where: {
          requestedById: req.user.id,
          status: { in: ["ACCEPTED", "REJECTED", "CANCELLED"] },
          challenge: { scheduledAt: { gt: now } },
        },
        include: {
          team: { select: teamSelect },
          challenge: {
            include: {
              team: { select: teamSelect },
              acceptedTeam: { select: teamSelect },
            },
          },
        },
        orderBy: { respondedAt: "desc" },
        take: 50,
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: { incoming, outcomes },
    });
  } catch (error) {
    console.log("Error in listMyChallengeNotifications:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const respondChallengeRequest = async (req, res) => {
  try {
    const requestId = parsePositiveInt(req.params.requestId);
    const action = String(req.body.action || "").toLowerCase();

    if (!requestId || !["accept", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Valid requestId and action (accept|reject) required",
      });
    }

    const request = await prisma.challengeRequest.findUnique({
      where: { id: requestId },
      include: {
        challenge: {
          include: {
            team: {
              select: {
                captainId: true,
              },
            },
          },
        },
      },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    if (request.challenge.team.captainId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the challenge team captain can respond",
      });
    }

    if (request.status !== "PENDING" || request.challenge.status !== "OPEN") {
      return res.status(400).json({
        success: false,
        message: "Request or challenge is no longer open",
      });
    }

    if (action === "reject") {
      const updated = await prisma.challengeRequest.update({
        where: { id: requestId },
        data: { status: "REJECTED", respondedAt: new Date() },
      });
      return res.status(200).json({
        success: true,
        message: "Request rejected",
        data: updated,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const match = await tx.match.create({
        data: {
          homeTeamId: request.challenge.teamId,
          awayTeamId: request.teamId,
          scheduledAt: request.challenge.scheduledAt,
          venue: request.challenge.venue,
          notes: request.challenge.notes,
          matchType: "FRIENDLY",
          createdById: request.challenge.createdById,
        },
      });

      await tx.challengeRequest.update({
        where: { id: requestId },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      });

      await tx.challengeRequest.updateMany({
        where: {
          challengeId: request.challengeId,
          id: { not: requestId },
          status: "PENDING",
        },
        data: { status: "CANCELLED", respondedAt: new Date() },
      });

      const challenge = await tx.challenge.update({
        where: { id: request.challengeId },
        data: {
          status: "ACCEPTED",
          acceptedTeamId: request.teamId,
          matchId: match.id,
        },
        include: challengeInclude,
      });

      return { challenge, match };
    });

    return res.status(200).json({
      success: true,
      message: "Challenge accepted — match created",
      data: result,
    });
  } catch (error) {
    console.log("Error in respondChallengeRequest:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const cancelChallenge = async (req, res) => {
  try {
    const challengeId = parsePositiveInt(req.params.challengeId);
    if (!challengeId) {
      return res.status(400).json({
        success: false,
        message: "Invalid challenge id",
      });
    }

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: "Challenge not found",
      });
    }

    if (challenge.createdById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the creator can cancel",
      });
    }

    if (challenge.status !== "OPEN") {
      return res.status(400).json({
        success: false,
        message: "Only open challenges can be cancelled",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.challengeRequest.updateMany({
        where: {
          challengeId,
          status: "PENDING",
        },
        data: {
          status: "CANCELLED",
          respondedAt: new Date(),
        },
      });

      return tx.challenge.update({
        where: { id: challengeId },
        data: { status: "CANCELLED" },
        include: challengeInclude,
      });
    });

    return res.status(200).json({
      success: true,
      message: "Challenge cancelled",
      data: updated,
    });
  } catch (error) {
    console.log("Error in cancelChallenge:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
