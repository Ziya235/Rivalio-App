import { prisma } from "../config/db.js";
import { parsePositiveInt, teamSelect, userBriefSelect } from "../utils/helpers.js";
import { getTeamLeagueStats } from "../utils/leagueStats.js";

const teamDetailInclude = {
  captain: { select: userBriefSelect },
  players: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      position: true,
      shirtNumber: true,
      photo: true,
      userId: true,
      user: { select: userBriefSelect },
    },
    orderBy: [{ shirtNumber: "asc" }, { lastName: "asc" }],
  },
  leagueMemberships: {
    select: {
      joinedAt: true,
      league: {
        select: {
          id: true,
          name: true,
          logo: true,
          visibility: true,
          status: true,
          season: true,
        },
      },
    },
  },
  _count: { select: { players: true } },
};

export const uploadPublicImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image file is required",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Image uploaded",
      data: { url: `/uploads/${req.file.filename}` },
    });
  } catch (error) {
    console.log("Error in uploadPublicImage:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const createUserTeam = async (req, res) => {
  try {
    const { name, shortName, logo, description, city, primaryColor, secondaryColor, foundedYear } =
      req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Team name is required",
      });
    }

    const trimmedName = name.trim();

    const existing = await prisma.team.findUnique({
      where: { name: trimmedName },
      select: { id: true },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Team name already taken",
      });
    }

    const team = await prisma.$transaction(async (tx) => {
      const created = await tx.team.create({
        data: {
          name: trimmedName,
          shortName: shortName?.trim() || null,
          logo: logo || null,
          description: description || null,
          city: city?.trim() || null,
          primaryColor: primaryColor || null,
          secondaryColor: secondaryColor || null,
          foundedYear: foundedYear || null,
          captainId: req.user.id,
        },
      });

      await tx.player.create({
        data: {
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          teamId: created.id,
          userId: req.user.id,
          position: "Captain",
        },
      });

      return tx.team.findUnique({
        where: { id: created.id },
        include: teamDetailInclude,
      });
    });

    return res.status(201).json({
      success: true,
      message: "Team created successfully",
      data: {
        ...team,
        leagueStats: { matchesPlayed: 0, goals: 0, assists: 0 },
      },
    });
  } catch (error) {
    console.log("Error in createUserTeam:", error);
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Team name already taken",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const listTeams = async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const mine = req.query.mine === "true" || req.query.mine === "1";

    const where = {};

    if (mine) {
      where.OR = [
        { captainId: req.user.id },
        { players: { some: { userId: req.user.id } } },
      ];
    }

    if (q) {
      where.name = { contains: q, mode: "insensitive" };
    }

    const teams = await prisma.team.findMany({
      where,
      select: {
        ...teamSelect,
        description: true,
        captain: { select: userBriefSelect },
        _count: { select: { players: true } },
        leagueMemberships: {
          select: {
            league: {
              select: {
                id: true,
                name: true,
                logo: true,
                visibility: true,
                status: true,
                season: true,
                sport: { select: { id: true, name: true, code: true } },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
      take: 100,
    });

    return res.status(200).json({
      success: true,
      data: teams,
    });
  } catch (error) {
    console.log("Error in listTeams:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getTeamById = async (req, res) => {
  try {
    const teamId = parsePositiveInt(req.params.teamId);
    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: "Invalid team id",
      });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: teamDetailInclude,
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    const leagueStats = await getTeamLeagueStats(teamId);

    return res.status(200).json({
      success: true,
      data: { ...team, leagueStats },
    });
  } catch (error) {
    console.log("Error in getTeamById:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const addPlayerByUsername = async (req, res) => {
  try {
    const teamId = parsePositiveInt(req.params.teamId);
    const { username, position, shirtNumber } = req.body;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: "Invalid team id",
      });
    }

    if (!username?.trim()) {
      return res.status(400).json({
        success: false,
        message: "username is required",
      });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, captainId: true },
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    if (team.captainId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the team captain can add players",
      });
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        image: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const existing = await prisma.player.findFirst({
      where: { teamId, userId: user.id },
      select: { id: true },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "User is already on this team",
      });
    }

    const player = await prisma.player.create({
      data: {
        firstName: user.firstName,
        lastName: user.lastName,
        position: position?.trim() || null,
        shirtNumber: shirtNumber || null,
        photo: user.image || null,
        teamId,
        userId: user.id,
      },
      include: {
        user: { select: userBriefSelect },
      },
    });

    // Sync into leagues this team belongs to
    const memberships = await prisma.leagueTeam.findMany({
      where: { teamId },
      select: { leagueId: true },
    });

    for (const m of memberships) {
      await prisma.leagueMember.upsert({
        where: {
          leagueId_userId: { leagueId: m.leagueId, userId: user.id },
        },
        create: {
          leagueId: m.leagueId,
          userId: user.id,
          role: "PLAYER",
        },
        update: {},
      });
    }

    return res.status(201).json({
      success: true,
      message: "Player added successfully",
      data: player,
    });
  } catch (error) {
    console.log("Error in addPlayerByUsername:", error);
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "User is already on this team",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const removeTeamPlayer = async (req, res) => {
  try {
    const teamId = parsePositiveInt(req.params.teamId);
    const playerId = parsePositiveInt(req.params.playerId);

    if (!teamId || !playerId) {
      return res.status(400).json({
        success: false,
        message: "Invalid team or player id",
      });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, captainId: true },
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    if (team.captainId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the team captain can remove players",
      });
    }

    const player = await prisma.player.findFirst({
      where: { id: playerId, teamId },
    });

    if (!player) {
      return res.status(404).json({
        success: false,
        message: "Player not found",
      });
    }

    if (player.userId === team.captainId) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove the team captain from the roster",
      });
    }

    await prisma.player.delete({ where: { id: playerId } });

    return res.status(200).json({
      success: true,
      message: "Player removed successfully",
    });
  } catch (error) {
    console.log("Error in removeTeamPlayer:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
