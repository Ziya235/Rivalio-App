import { prisma } from "../config/db.js";
import { getPlayerProfile } from "./playerController.js";

const SEARCH_LIMIT = 12;

function rankScore(user, q) {
  const username = user.username.toLowerCase();
  const first = user.firstName.toLowerCase();
  const last = user.lastName.toLowerCase();
  const full = `${first} ${last}`.trim();

  if (username === q) return 0;
  if (username.startsWith(q)) return 1;
  if (first.startsWith(q) || last.startsWith(q) || full.startsWith(q)) return 2;
  if (username.includes(q)) return 3;
  return 4;
}

export const searchUsers = async (req, res) => {
  try {
    const raw = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const q = raw.replace(/^@+/, "").slice(0, 50);

    if (q.length < 1) {
      return res.status(200).json({ success: true, data: [] });
    }

    const tokens = q.split(/\s+/).filter(Boolean);
    const namePair =
      tokens.length >= 2
        ? {
            AND: [
              { firstName: { contains: tokens[0], mode: "insensitive" } },
              {
                lastName: {
                  contains: tokens.slice(1).join(" "),
                  mode: "insensitive",
                },
              },
            ],
          }
        : null;

    const users = await prisma.user.findMany({
      where: {
        role: "USER",
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          ...(namePair ? [namePair] : []),
        ],
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        image: true,
        players: {
          select: {
            id: true,
            team: { select: { name: true } },
          },
          orderBy: { id: "asc" },
          take: 1,
        },
      },
      take: 30,
    });

    const qLower = q.toLowerCase();
    const data = users
      .slice()
      .sort((a, b) => {
        const diff = rankScore(a, qLower) - rankScore(b, qLower);
        if (diff !== 0) return diff;
        return a.username.localeCompare(b.username);
      })
      .slice(0, SEARCH_LIMIT)
      .map((user) => ({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        image: user.image,
        playerId: user.players[0]?.id ?? null,
        teamName: user.players[0]?.team?.name ?? null,
      }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.log("Error in searchUsers:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        image: true,
        dateOfBirth: true,
        bio: true,
        workplace: true,
        school: true,
        gamesPlayed: true,
        goals: true,
        assists: true,
        players: {
          select: { id: true },
          orderBy: { id: "asc" },
          take: 1,
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const playerId = user.players[0]?.id;
    if (playerId) {
      req.params.playerId = String(playerId);
      return getPlayerProfile(req, res);
    }

    return res.status(200).json({
      success: true,
      data: {
        id: 0,
        userId: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        image: user.image,
        position: null,
        shirtNumber: null,
        description: user.bio,
        dateOfBirth: user.dateOfBirth,
        workplace: user.workplace,
        school: user.school,
        stats: {
          gamesPlayed: user.gamesPlayed,
          goals: user.goals,
          assists: user.assists,
        },
        teams: [],
        leagues: [],
      },
    });
  } catch (error) {
    console.log("Error in getUserProfile:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
