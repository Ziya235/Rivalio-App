import { prisma } from "../config/db.js";
import {
  attachPlayerStats,
  getPlayerStatsMap,
} from "../utils/playerStats.js";
import {
  PLAYOFF_ONLY_SIZES,
  buildGroupFixtures,
  buildGroupPlayoffPlan,
  buildLinearPlayoffPlan,
  compareStandingStats,
  distributeGroupSlots,
  groupLetterFromName,
  nextStageAfter,
  parsePlayoffNotes,
  pickGroupTopTwo,
  playoffNotes,
} from "../utils/championshipBracket.js";
import {
  GROUP_CAPACITY_MAX,
  GROUP_CAPACITY_MIN,
  GROUP_CHAMP_TEAM_MAX,
  GROUP_CHAMP_TEAM_MIN,
  GROUP_COUNT_MAX,
  GROUP_COUNT_MIN,
  validateGroupSlots,
} from "../utils/championshipGroups.js";

const MATCH_FORMATS = ["SINGLE", "HOME_AWAY"];

const teamBrief = {
  id: true,
  name: true,
  shortName: true,
  logo: true,
};

const userBrief = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
};

const matchInclude = {
  homeTeam: { select: teamBrief },
  awayTeam: { select: teamBrief },
  winnerTeam: { select: teamBrief },
  group: { select: { id: true, name: true } },
  events: {
    include: {
      team: { select: teamBrief },
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          shirtNumber: true,
          photo: true,
          teamId: true,
        },
      },
      assistPlayer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          shirtNumber: true,
          photo: true,
          teamId: true,
        },
      },
      playerIn: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          shirtNumber: true,
          photo: true,
          teamId: true,
        },
      },
      playerOut: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          shirtNumber: true,
          photo: true,
          teamId: true,
        },
      },
    },
    orderBy: [{ minute: "asc" }, { id: "asc" }],
  },
};

function httpError(message, status = 400, extra = {}) {
  const error = new Error(message);
  error.status = status;
  Object.assign(error, extra);
  return error;
}

function parseId(value, label = "id") {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw httpError(`Valid ${label} is required`);
  return n;
}

const championshipInclude = {
  sport: { select: { id: true, name: true, code: true } },
  createdBy: { select: userBrief },
  _count: { select: { teams: true, groups: true, matches: true } },
  teams: {
    include: { team: { select: teamBrief } },
    orderBy: { joinedAt: "asc" },
  },
  groups: {
    include: {
      teams: {
        include: { team: { select: teamBrief } },
        orderBy: { seed: "asc" },
      },
      _count: { select: { matches: true } },
    },
    orderBy: { sortOrder: "asc" },
  },
};

export function formatChampionship(c) {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    logo: c.logo,
    format: c.format,
    matchFormat: c.matchFormat ?? "SINGLE",
    status: c.status,
    startDate: c.startDate,
    endDate: c.endDate,
    maxTeams: c.maxTeams,
    defaultQualifyCount: c.defaultQualifyCount,
    sportId: c.sportId,
    createdById: c.createdById,
    sport: c.sport,
    createdBy: c.createdBy,
    teamCount: c._count?.teams ?? c.teams?.length ?? 0,
    groupCount: c._count?.groups ?? c.groups?.length ?? 0,
    matchCount: c._count?.matches ?? 0,
    teams: (c.teams ?? []).map((ct) => ({
      id: ct.id,
      teamId: ct.teamId,
      joinedAt: ct.joinedAt,
      team: ct.team,
    })),
    groups: (c.groups ?? []).map(formatGroup),
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export function formatGroup(g) {
  return {
    id: g.id,
    championshipId: g.championshipId,
    name: g.name,
    teamSlots: g.teamSlots,
    qualifyCount: g.qualifyCount,
    sortOrder: g.sortOrder,
    teams: (g.teams ?? []).map((gt) => ({
      id: gt.id,
      teamId: gt.teamId,
      seed: gt.seed,
      team: gt.team,
      joinedAt: gt.joinedAt,
    })),
    matchCount: g._count?.matches ?? undefined,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
}

export function formatMatch(m) {
  return m;
}

async function getOwnedChampionship(championshipId, userId, opts = {}) {
  const id = parseId(championshipId, "championshipId");
  const include =
    opts.include === undefined ? championshipInclude : opts.include;
  const c = await prisma.championship.findUnique({
    where: { id },
    ...(include ? { include } : {}),
  });
  if (!c) throw httpError("Championship not found", 404);
  if (c.createdById !== userId) {
    throw httpError("You can only manage your own championships", 403);
  }
  return c;
}

export async function listChampionships(userId, { mineOnly = true } = {}) {
  const where = mineOnly ? { createdById: userId } : {};
  const rows = await prisma.championship.findMany({
    where,
    include: championshipInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(formatChampionship);
}

export async function getChampionship(championshipId, userId) {
  const c = await getOwnedChampionship(championshipId, userId);
  return formatChampionship(c);
}

export async function createChampionship(userId, body) {
  const name = String(body.name || "").trim();
  if (!name) throw httpError("Championship name is required");

  const format = body.format || "GROUP_AND_PLAYOFF";
  if (!["GROUP_AND_PLAYOFF", "PLAYOFF_ONLY"].includes(format)) {
    throw httpError("Invalid format");
  }

  const matchFormat = body.matchFormat || "SINGLE";
  if (!MATCH_FORMATS.includes(matchFormat)) {
    throw httpError("Invalid matchFormat — use SINGLE or HOME_AWAY");
  }

  const sportCode = body.sportCode || "FOOTBALL";
  const sport = await prisma.sport.findUnique({ where: { code: sportCode } });
  if (!sport || !sport.isEnabled) {
    throw httpError("Sport is not available", 400);
  }

  let startDate = null;
  let endDate = null;
  if (body.startDate) {
    startDate = new Date(body.startDate);
    if (Number.isNaN(startDate.getTime())) throw httpError("Invalid startDate");
  }
  if (body.endDate) {
    endDate = new Date(body.endDate);
    if (Number.isNaN(endDate.getTime())) throw httpError("Invalid endDate");
  }

  let maxTeams =
    body.maxTeams != null ? Number(body.maxTeams) : body.teamCount != null
      ? Number(body.teamCount)
      : null;
  if (format === "PLAYOFF_ONLY") {
    if (maxTeams == null) maxTeams = 8;
    if (!PLAYOFF_ONLY_SIZES.includes(maxTeams)) {
      throw httpError("Playoff-only championship maxTeams must be 4, 8, or 16");
    }
  } else if (maxTeams != null) {
    if (
      !Number.isInteger(maxTeams) ||
      maxTeams < GROUP_CHAMP_TEAM_MIN ||
      maxTeams > GROUP_CHAMP_TEAM_MAX
    ) {
      throw httpError(
        `maxTeams must be between ${GROUP_CHAMP_TEAM_MIN} and ${GROUP_CHAMP_TEAM_MAX}`,
      );
    }
  } else {
    maxTeams = GROUP_CHAMP_TEAM_MAX;
  }

  const defaultQualifyCount =
    body.defaultQualifyCount != null ? Number(body.defaultQualifyCount) : 2;
  if (!Number.isInteger(defaultQualifyCount) || defaultQualifyCount < 1) {
    throw httpError("defaultQualifyCount must be a positive integer");
  }

  const created = await prisma.championship.create({
    data: {
      name,
      description: body.description?.trim() || null,
      logo: body.logo || null,
      format,
      matchFormat,
      status: "DRAFT",
      startDate,
      endDate,
      maxTeams,
      defaultQualifyCount,
      sportId: sport.id,
      createdById: userId,
    },
    include: championshipInclude,
  });

  return formatChampionship(created);
}

export async function updateChampionship(championshipId, userId, body) {
  const c = await getOwnedChampionship(championshipId, userId, { include: undefined });

  const data = {};
  if (body.name != null) {
    const name = String(body.name).trim();
    if (!name) throw httpError("Name cannot be empty");
    data.name = name;
  }
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.logo !== undefined) data.logo = body.logo || null;
  if (body.startDate !== undefined) {
    data.startDate = body.startDate ? new Date(body.startDate) : null;
  }
  if (body.endDate !== undefined) {
    data.endDate = body.endDate ? new Date(body.endDate) : null;
  }
  if (body.maxTeams !== undefined) {
    data.maxTeams = body.maxTeams == null ? null : Number(body.maxTeams);
  }
  if (body.defaultQualifyCount != null) {
    data.defaultQualifyCount = Number(body.defaultQualifyCount);
  }
  if (body.format != null) {
    if (!["GROUP_AND_PLAYOFF", "PLAYOFF_ONLY"].includes(body.format)) {
      throw httpError("Invalid format");
    }
    if (c.status !== "DRAFT" && c.status !== "REGISTRATION") {
      throw httpError("Format can only change in DRAFT/REGISTRATION");
    }
    data.format = body.format;
  }
  if (body.matchFormat != null) {
    if (!MATCH_FORMATS.includes(body.matchFormat)) {
      throw httpError("Invalid matchFormat — use SINGLE or HOME_AWAY");
    }
    if (c.status !== "DRAFT" && c.status !== "REGISTRATION") {
      throw httpError("Match format can only change in DRAFT/REGISTRATION");
    }
    data.matchFormat = body.matchFormat;
  }

  const nextFormat = data.format ?? c.format;
  const nextMax =
    data.maxTeams !== undefined ? data.maxTeams : c.maxTeams;
  if (nextFormat === "PLAYOFF_ONLY") {
    if (nextMax == null || !PLAYOFF_ONLY_SIZES.includes(Number(nextMax))) {
      throw httpError("Playoff-only championship maxTeams must be 4, 8, or 16");
    }
    data.maxTeams = Number(nextMax);
  }

  const updated = await prisma.championship.update({
    where: { id: c.id },
    data,
    include: championshipInclude,
  });
  return formatChampionship(updated);
}

export async function deleteChampionship(championshipId, userId) {
  await getOwnedChampionship(championshipId, userId, { include: undefined });
  await prisma.championship.delete({ where: { id: Number(championshipId) } });
  return { ok: true };
}

const ALLOWED_TRANSITIONS = {
  DRAFT: ["REGISTRATION", "GROUP_STAGE", "PLAYOFF", "CANCELLED"],
  REGISTRATION: ["DRAFT", "GROUP_STAGE", "PLAYOFF", "CANCELLED"],
  GROUP_STAGE: ["PLAYOFF", "CANCELLED"],
  PLAYOFF: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export async function transitionChampionshipStatus(championshipId, userId, nextStatus) {
  const c = await getOwnedChampionship(championshipId, userId);
  if (!ALLOWED_TRANSITIONS[c.status]?.includes(nextStatus)) {
    throw httpError(
      `Cannot transition from ${c.status} to ${nextStatus}`,
      400,
    );
  }

  if (nextStatus === "GROUP_STAGE") {
    if (c.format === "PLAYOFF_ONLY") {
      throw httpError("Playoff-only championships skip group stage — start playoff instead");
    }
    if (c.teams.length < GROUP_CHAMP_TEAM_MIN) {
      throw httpError(
        `Çempionata başlamaq üçün ən azı ${GROUP_CHAMP_TEAM_MIN} komanda lazımdır`,
      );
    }
    if (c.teams.length > GROUP_CHAMP_TEAM_MAX) {
      throw httpError(`Maksimum ${GROUP_CHAMP_TEAM_MAX} komanda ola bilər`);
    }
    if (c.format === "GROUP_AND_PLAYOFF") {
      if (c.groups.length < GROUP_COUNT_MIN) {
        throw httpError("Create groups before starting group stage");
      }
      if (c.groups.length > GROUP_COUNT_MAX) {
        throw httpError("Qrup sayı 2–4 aralığında olmalıdır.");
      }
      const slots = c.groups.map((g) => g.teamSlots);
      const slotError = validateGroupSlots({
        teamCount: c.teams.length,
        groupCount: c.groups.length,
        slots,
        slotMode: slots.every((s) => s === slots[0]) ? "same" : "perGroup",
      });
      if (slotError) throw httpError(slotError);
      for (const g of c.groups) {
        if (g.teams.length < GROUP_CAPACITY_MIN) {
          throw httpError(
            `${g.name} üçün ən azı ${GROUP_CAPACITY_MIN} komanda lazımdır`,
          );
        }
        if (g.teamSlots != null && g.teams.length !== g.teamSlots) {
          throw httpError(
            `${g.name} üçün ${g.teamSlots} komanda lazımdır. Hal-hazırda ${g.teams.length} təyin olunub.`,
          );
        }
      }
      const assignedCount = c.groups.reduce((n, g) => n + g.teams.length, 0);
      if (assignedCount !== c.teams.length) {
        throw httpError("Bütün komandalar qruplara təyin olunmalıdır");
      }
    }
  }

  if (nextStatus === "PLAYOFF") {
    // validated in startPlayoff
  }

  const updated = await prisma.championship.update({
    where: { id: c.id },
    data: { status: nextStatus },
    include: championshipInclude,
  });
  return formatChampionship(updated);
}

export async function addTeamToChampionship(championshipId, userId, teamIdRaw) {
  const c = await getOwnedChampionship(championshipId, userId);
  if (!["DRAFT", "REGISTRATION"].includes(c.status)) {
    throw httpError("Teams can only be added in DRAFT or REGISTRATION");
  }
  const teamId = parseId(teamIdRaw, "teamId");

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw httpError("Team not found", 404);

  if (c.format === "PLAYOFF_ONLY") {
    if (c.maxTeams != null && c.teams.length >= c.maxTeams) {
      throw httpError(`Championship is limited to ${c.maxTeams} teams`);
    }
  } else if (c.teams.length >= GROUP_CHAMP_TEAM_MAX) {
    throw httpError(`Maksimum ${GROUP_CHAMP_TEAM_MAX} komanda ola bilər`);
  }

  const existing = await prisma.championshipTeam.findUnique({
    where: {
      championshipId_teamId: { championshipId: c.id, teamId },
    },
  });
  if (existing) throw httpError("Team is already in this championship", 409);

  await prisma.championshipTeam.create({
    data: { championshipId: c.id, teamId },
  });

  return getChampionship(c.id, userId);
}

export async function removeTeamFromChampionship(championshipId, userId, teamIdRaw) {
  const c = await getOwnedChampionship(championshipId, userId);
  if (!["DRAFT", "REGISTRATION"].includes(c.status)) {
    throw httpError("Teams can only be removed in DRAFT or REGISTRATION");
  }
  const teamId = parseId(teamIdRaw, "teamId");

  await prisma.$transaction(async (tx) => {
    await tx.championshipGroupTeam.deleteMany({
      where: {
        teamId,
        group: { championshipId: c.id },
      },
    });
    const deleted = await tx.championshipTeam.deleteMany({
      where: { championshipId: c.id, teamId },
    });
    if (deleted.count === 0) throw httpError("Team is not in this championship", 404);
  });

  return getChampionship(c.id, userId);
}

export async function listChampionshipTeams(championshipId, userId) {
  const c = await getOwnedChampionship(championshipId, userId);
  return c.teams.map((ct) => ({
    id: ct.id,
    teamId: ct.teamId,
    joinedAt: ct.joinedAt,
    team: ct.team,
  }));
}

function nextGroupNames(existingNames, count) {
  const used = new Set(existingNames);
  const names = [];
  let i = 0;
  while (names.length < count && i < 26) {
    const name = `Group ${String.fromCharCode(65 + i)}`;
    if (!used.has(name)) names.push(name);
    i += 1;
  }
  let extra = 1;
  while (names.length < count) {
    const name = `Group ${extra}`;
    if (!used.has(name)) names.push(name);
    extra += 1;
  }
  return names;
}

/**
 * Create groups.
 * body: { groupCount, teamSlots?: number|null, perGroupSlots?: (number|null)[], qualifyCount, autoAssign?: boolean }
 */
export async function createGroups(championshipId, userId, body) {
  const c = await getOwnedChampionship(championshipId, userId);
  if (c.format === "PLAYOFF_ONLY") {
    throw httpError("Playoff-only championships do not use groups");
  }
  if (!["DRAFT", "REGISTRATION"].includes(c.status)) {
    throw httpError("Groups can only be created before group stage starts");
  }

  const groupCount = Number(body.groupCount);
  if (
    !Number.isInteger(groupCount) ||
    groupCount < GROUP_COUNT_MIN ||
    groupCount > GROUP_COUNT_MAX
  ) {
    throw httpError("Qrup sayı 2–4 aralığında olmalıdır.");
  }
  if (c.groups.length + groupCount > GROUP_COUNT_MAX) {
    throw httpError("Qrup sayı 2–4 aralığında olmalıdır.");
  }

  if (c.teams.length < GROUP_CHAMP_TEAM_MIN) {
    throw httpError(
      `Qrup yaratmaq üçün ən azı ${GROUP_CHAMP_TEAM_MIN} komanda lazımdır`,
    );
  }
  if (c.teams.length > GROUP_CHAMP_TEAM_MAX) {
    throw httpError(`Maksimum ${GROUP_CHAMP_TEAM_MAX} komanda ola bilər`);
  }

  const qualifyCount =
    body.qualifyCount != null ? Number(body.qualifyCount) : c.defaultQualifyCount;
  if (!Number.isInteger(qualifyCount) || qualifyCount < 1) {
    throw httpError("qualifyCount must be a positive integer");
  }

  let slots;
  let slotMode = "same";
  if (Array.isArray(body.perGroupSlots) && body.perGroupSlots.length === groupCount) {
    slotMode = "perGroup";
    slots = body.perGroupSlots.map((s) => Number(s));
  } else if (body.teamSlots == null || body.teamSlots === "") {
    throw httpError("Qrup tutumu mütləqdir");
  } else {
    const n = Number(body.teamSlots);
    slots = Array.from({ length: groupCount }, () => n);
  }

  const slotError = validateGroupSlots({
    teamCount: c.teams.length,
    groupCount,
    slots,
    slotMode,
  });
  if (slotError) throw httpError(slotError);

  for (const s of slots) {
    if (qualifyCount > s) {
      throw httpError(
        `Top ${qualifyCount} qualify cannot be greater than group capacity ${s}`,
      );
    }
  }

  const names = nextGroupNames(
    c.groups.map((g) => g.name),
    groupCount,
  );
  const startOrder = c.groups.length;

  const created = await prisma.$transaction(
    async (tx) => {
      const groups = [];
      for (let i = 0; i < groupCount; i++) {
        const g = await tx.championshipGroup.create({
          data: {
            championshipId: c.id,
            name: names[i],
            teamSlots: slots[i],
            qualifyCount,
            sortOrder: startOrder + i,
          },
        });
        groups.push(g);
      }

      if (body.autoAssign && c.teams.length > 0) {
        const teamIds = c.teams.map((t) => t.teamId);
        await tx.championshipGroupTeam.deleteMany({
          where: { group: { championshipId: c.id } },
        });

        const balanced =
          slots.every((s) => s != null)
            ? slots
            : distributeGroupSlots(teamIds.length, groupCount);

        const rows = [];
        let cursor = 0;
        for (let i = 0; i < groups.length; i++) {
          const take = balanced[i] ?? 0;
          const slice = teamIds.slice(cursor, cursor + take);
          cursor += take;
          for (let s = 0; s < slice.length; s++) {
            rows.push({
              groupId: groups[i].id,
              teamId: slice[s],
              seed: s,
            });
          }
          if (groups[i].teamSlots == null && take > 0) {
            await tx.championshipGroup.update({
              where: { id: groups[i].id },
              data: { teamSlots: take },
            });
          }
        }
        if (rows.length > 0) {
          await tx.championshipGroupTeam.createMany({ data: rows });
        }
      }

      return tx.championshipGroup.findMany({
        where: { championshipId: c.id },
        include: {
          teams: {
            include: { team: { select: teamBrief } },
            orderBy: { seed: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      });
    },
    { maxWait: 10000, timeout: 30000 },
  );

  return created.map(formatGroup);
}

export async function listGroups(championshipId, userId) {
  const c = await getOwnedChampionship(championshipId, userId);
  return c.groups.map(formatGroup);
}

export async function updateGroup(groupId, userId, body) {
  const id = parseId(groupId, "groupId");
  const group = await prisma.championshipGroup.findUnique({
    where: { id },
    include: {
      championship: true,
      teams: true,
    },
  });
  if (!group) throw httpError("Group not found", 404);
  if (group.championship.createdById !== userId) {
    throw httpError("You can only manage your own championships", 403);
  }
  if (!["DRAFT", "REGISTRATION"].includes(group.championship.status)) {
    throw httpError("Groups are locked after group stage starts");
  }

  const data = {};
  if (body.name != null) {
    const name = String(body.name).trim();
    if (!name) throw httpError("Name required");
    data.name = name;
  }
  if (body.teamSlots !== undefined) {
    data.teamSlots =
      body.teamSlots === null || body.teamSlots === ""
        ? null
        : Number(body.teamSlots);
    if (data.teamSlots == null) {
      throw httpError("Qrup tutumu mütləqdir");
    }
    if (
      !Number.isInteger(data.teamSlots) ||
      data.teamSlots < GROUP_CAPACITY_MIN ||
      data.teamSlots > GROUP_CAPACITY_MAX
    ) {
      throw httpError("Qrup tutumu 3–7 aralığında olmalıdır.");
    }
    if (data.teamSlots != null && data.teamSlots < group.teams.length) {
      throw httpError("Capacity cannot be less than assigned teams");
    }
  }
  if (body.qualifyCount != null) {
    data.qualifyCount = Number(body.qualifyCount);
    if (!Number.isInteger(data.qualifyCount) || data.qualifyCount < 1) {
      throw httpError("Invalid qualifyCount");
    }
  }

  const updated = await prisma.championshipGroup.update({
    where: { id },
    data,
    include: {
      teams: { include: { team: { select: teamBrief } }, orderBy: { seed: "asc" } },
    },
  });
  return formatGroup(updated);
}

export async function deleteGroup(groupId, userId) {
  const id = parseId(groupId, "groupId");
  const group = await prisma.championshipGroup.findUnique({
    where: { id },
    include: { championship: true },
  });
  if (!group) throw httpError("Group not found", 404);
  if (group.championship.createdById !== userId) {
    throw httpError("You can only manage your own championships", 403);
  }
  if (!["DRAFT", "REGISTRATION"].includes(group.championship.status)) {
    throw httpError("Groups are locked after group stage starts");
  }
  await prisma.championshipGroup.delete({ where: { id } });
  return { ok: true };
}

export async function addTeamToGroup(groupId, userId, teamIdRaw) {
  const id = parseId(groupId, "groupId");
  const teamId = parseId(teamIdRaw, "teamId");

  const group = await prisma.championshipGroup.findUnique({
    where: { id },
    include: {
      championship: { include: { teams: true } },
      teams: true,
    },
  });
  if (!group) throw httpError("Group not found", 404);
  if (group.championship.createdById !== userId) {
    throw httpError("You can only manage your own championships", 403);
  }
  if (!["DRAFT", "REGISTRATION"].includes(group.championship.status)) {
    throw httpError("Cannot change group teams after group stage starts");
  }

  const inChamp = group.championship.teams.some((t) => t.teamId === teamId);
  if (!inChamp) throw httpError("Team must be added to championship first");

  if (group.teamSlots != null && group.teams.length >= group.teamSlots) {
    throw httpError("Group is full");
  }
  if (group.teams.length >= GROUP_CAPACITY_MAX) {
    throw httpError(`Qrupda maksimum ${GROUP_CAPACITY_MAX} komanda ola bilər`);
  }

  const alreadyInGroup = await prisma.championshipGroupTeam.findFirst({
    where: {
      teamId,
      group: { championshipId: group.championshipId },
    },
  });
  if (alreadyInGroup) {
    throw httpError("Team is already assigned to a group in this championship", 409);
  }

  await prisma.championshipGroupTeam.create({
    data: {
      groupId: id,
      teamId,
      seed: group.teams.length,
    },
  });

  const updated = await prisma.championshipGroup.findUnique({
    where: { id },
    include: {
      teams: { include: { team: { select: teamBrief } }, orderBy: { seed: "asc" } },
    },
  });
  return formatGroup(updated);
}

export async function removeTeamFromGroup(groupId, userId, teamIdRaw) {
  const id = parseId(groupId, "groupId");
  const teamId = parseId(teamIdRaw, "teamId");
  const group = await prisma.championshipGroup.findUnique({
    where: { id },
    include: { championship: true },
  });
  if (!group) throw httpError("Group not found", 404);
  if (group.championship.createdById !== userId) {
    throw httpError("You can only manage your own championships", 403);
  }
  if (!["DRAFT", "REGISTRATION"].includes(group.championship.status)) {
    throw httpError("Cannot change group teams after group stage starts");
  }

  const deleted = await prisma.championshipGroupTeam.deleteMany({
    where: { groupId: id, teamId },
  });
  if (deleted.count === 0) throw httpError("Team not in this group", 404);

  const updated = await prisma.championshipGroup.findUnique({
    where: { id },
    include: {
      teams: { include: { team: { select: teamBrief } }, orderBy: { seed: "asc" } },
    },
  });
  return formatGroup(updated);
}

export async function startGroupStage(championshipId, userId) {
  const previous = await getOwnedChampionship(championshipId, userId, {
    include: undefined,
  });
  const prevStatus = previous.status;
  await transitionChampionshipStatus(championshipId, userId, "GROUP_STAGE");
  try {
    await generateGroupMatches(championshipId, userId);
  } catch (err) {
    await prisma.championship.update({
      where: { id: previous.id },
      data: { status: prevStatus },
    });
    throw err;
  }
  return getChampionship(championshipId, userId);
}

export async function generateGroupMatches(championshipId, userId, { groupId } = {}) {
  const c = await getOwnedChampionship(championshipId, userId);
  if (!["DRAFT", "REGISTRATION", "GROUP_STAGE"].includes(c.status)) {
    throw httpError("Cannot generate matches in current status");
  }

  const groups = groupId
    ? c.groups.filter((g) => g.id === Number(groupId))
    : c.groups;

  if (groups.length === 0) throw httpError("No groups found");

  const created = await prisma.$transaction(async (tx) => {
    const homeAway = (c.matchFormat || "SINGLE") === "HOME_AWAY";

    for (const g of groups) {
      const teamIds = g.teams.map((t) => t.teamId);
      if (teamIds.length < GROUP_CAPACITY_MIN) {
        throw httpError(
          `${g.name} üçün ən azı ${GROUP_CAPACITY_MIN} komanda lazımdır`,
        );
      }

      // Replace existing group-stage matches for this group
      await tx.match.deleteMany({
        where: {
          championshipId: c.id,
          groupId: g.id,
          stage: "GROUP_STAGE",
          status: { in: ["SCHEDULED", "POSTPONED"] },
        },
      });

      const existingFinished = await tx.match.count({
        where: {
          championshipId: c.id,
          groupId: g.id,
          stage: "GROUP_STAGE",
          status: { in: ["FINISHED", "LIVE"] },
        },
      });
      if (existingFinished > 0) {
        throw httpError(
          `${g.name} already has started/finished matches — cannot regenerate`,
        );
      }

      // Also delete any leftover scheduled after failed partial — already done
      await tx.match.deleteMany({
        where: {
          championshipId: c.id,
          groupId: g.id,
          stage: "GROUP_STAGE",
        },
      });

      const rounds = buildGroupFixtures(teamIds, { homeAway });
      const rows = [];
      for (const round of rounds) {
        for (const p of round.pairings) {
          rows.push({
            championshipId: c.id,
            groupId: g.id,
            homeTeamId: p.homeTeamId,
            awayTeamId: p.awayTeamId,
            round: round.round,
            stage: "GROUP_STAGE",
            matchType: "CHAMPIONSHIP",
            status: "SCHEDULED",
            createdById: userId,
          });
        }
      }
      if (rows.length > 0) {
        await tx.match.createMany({ data: rows });
      }
    }

    if (c.status === "DRAFT" || c.status === "REGISTRATION") {
      await tx.championship.update({
        where: { id: c.id },
        data: { status: "GROUP_STAGE" },
      });
    }

    return tx.match.findMany({
      where: {
        championshipId: c.id,
        stage: "GROUP_STAGE",
        ...(groupId ? { groupId: Number(groupId) } : {}),
      },
      include: matchInclude,
      orderBy: [{ round: "asc" }, { id: "asc" }],
    });
  }, { maxWait: 10000, timeout: 30000 });

  return created;
}

export async function createChampionshipMatch(championshipId, userId, body) {
  const c = await getOwnedChampionship(championshipId, userId);
  if (!["GROUP_STAGE", "PLAYOFF", "REGISTRATION"].includes(c.status)) {
    throw httpError("Cannot create matches in current status");
  }

  const homeTeamId = parseId(body.homeTeamId, "homeTeamId");
  const awayTeamId = parseId(body.awayTeamId, "awayTeamId");
  if (homeTeamId === awayTeamId) throw httpError("Teams must be different");

  const champTeamIds = new Set(c.teams.map((t) => t.teamId));
  if (!champTeamIds.has(homeTeamId) || !champTeamIds.has(awayTeamId)) {
    throw httpError("Both teams must belong to the championship");
  }

  let groupId = body.groupId != null ? Number(body.groupId) : null;
  const stage = body.stage || (groupId ? "GROUP_STAGE" : "GROUP_STAGE");

  if (groupId) {
    const g = c.groups.find((x) => x.id === groupId);
    if (!g) throw httpError("Group not found", 404);
    const gTeamIds = new Set(g.teams.map((t) => t.teamId));
    if (!gTeamIds.has(homeTeamId) || !gTeamIds.has(awayTeamId)) {
      throw httpError("Both teams must be in the selected group");
    }
  }

  const scheduledAt = new Date(body.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) throw httpError("Valid scheduledAt required");
  if (scheduledAt.getTime() < Date.now() + 60 * 60 * 1000) {
    throw httpError("Oyun vaxtı keçmişdə ola bilməz. Ən azı 1 saat sonra seçin.");
  }

  const duplicate = await prisma.match.findFirst({
    where: {
      championshipId: c.id,
      groupId: groupId || undefined,
      stage,
      homeTeamId,
      awayTeamId,
      status: { not: "CANCELLED" },
    },
  });
  if (duplicate && stage === "GROUP_STAGE") {
    throw httpError("This pairing already exists in the group", 409);
  }

  const match = await prisma.match.create({
    data: {
      championshipId: c.id,
      groupId,
      homeTeamId,
      awayTeamId,
      round: body.round != null ? Number(body.round) : null,
      stage,
      matchType: "CHAMPIONSHIP",
      status: "SCHEDULED",
      scheduledAt,
      location: body.location?.trim() || null,
      venue: body.venue?.trim() || null,
      notes: body.notes?.trim() || null,
      createdById: userId,
    },
    include: matchInclude,
  });

  return match;
}

export async function listChampionshipMatches(championshipId, userId, query = {}) {
  const c = await getOwnedChampionship(championshipId, userId, { include: undefined });
  const where = { championshipId: c.id };
  if (query.groupId) where.groupId = Number(query.groupId);
  if (query.stage) where.stage = query.stage;
  if (query.status) where.status = query.status;

  return prisma.match.findMany({
    where,
    include: matchInclude,
    orderBy: [{ scheduledAt: { sort: "asc", nulls: "first" } }, { id: "asc" }],
  });
}

export async function getChampionshipMatch(matchId, userId) {
  const id = parseId(matchId, "matchId");
  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      ...matchInclude,
      championship: true,
    },
  });
  if (!match || !match.championshipId) throw httpError("Match not found", 404);
  if (match.championship.createdById !== userId) {
    throw httpError("You can only manage your own championships", 403);
  }
  return match;
}

export async function updateChampionshipMatch(matchId, userId, body) {
  const match = await getChampionshipMatch(matchId, userId);
  const data = {};

  if (body.scheduledAt != null) {
    const d = new Date(body.scheduledAt);
    if (Number.isNaN(d.getTime())) throw httpError("Invalid scheduledAt");
    if (d.getTime() < Date.now() + 60 * 60 * 1000) {
      throw httpError("Oyun vaxtı keçmişdə ola bilməz. Ən azı 1 saat sonra seçin.");
    }
    data.scheduledAt = d;
  }
  if (body.venue !== undefined) data.venue = body.venue?.trim() || null;
  if (body.location !== undefined) data.location = body.location?.trim() || null;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.round !== undefined) {
    data.round = body.round === null || body.round === "" ? null : Number(body.round);
  }
  if (body.minute !== undefined) data.minute = body.minute;

  if (body.status != null) {
    const status = body.status;
    if (!["SCHEDULED", "LIVE", "FINISHED", "CANCELLED", "POSTPONED"].includes(status)) {
      throw httpError("Invalid status");
    }
    data.status = status;
    if (status === "LIVE") {
      data.startedAt = match.startedAt || new Date();
      if (match.minute == null) data.minute = 1;
    }
    if (status === "FINISHED") {
      data.finishedAt = new Date();
      const hs = body.homeScore != null ? Number(body.homeScore) : match.homeScore;
      const as = body.awayScore != null ? Number(body.awayScore) : match.awayScore;
      data.homeScore = hs;
      data.awayScore = as;
      data.winnerTeamId =
        hs > as ? match.homeTeamId : as > hs ? match.awayTeamId : null;
    }
    if (status === "SCHEDULED") {
      data.startedAt = null;
      data.finishedAt = null;
      data.winnerTeamId = null;
      data.minute = null;
    }
  }

  if (body.homeScore != null) data.homeScore = Number(body.homeScore);
  if (body.awayScore != null) data.awayScore = Number(body.awayScore);

  const updated = await prisma.match.update({
    where: { id: match.id },
    data,
    include: matchInclude,
  });
  return updated;
}

export async function setMatchResult(matchId, userId, body) {
  const match = await getChampionshipMatch(matchId, userId);
  const homeScore = Number(body.homeScore);
  const awayScore = Number(body.awayScore);
  if (!Number.isInteger(homeScore) || homeScore < 0) {
    throw httpError("homeScore must be a non-negative integer");
  }
  if (!Number.isInteger(awayScore) || awayScore < 0) {
    throw httpError("awayScore must be a non-negative integer");
  }

  const winnerTeamId =
    homeScore > awayScore
      ? match.homeTeamId
      : awayScore > homeScore
        ? match.awayTeamId
        : null;

  const updated = await prisma.match.update({
    where: { id: match.id },
    data: {
      homeScore,
      awayScore,
      status: "FINISHED",
      finishedAt: new Date(),
      startedAt: match.startedAt || new Date(),
      winnerTeamId,
    },
    include: matchInclude,
  });

  await onChampionshipMatchFinished(updated.id);
  return getChampionshipMatch(updated.id, userId);
}

export async function deleteChampionshipMatch(matchId, userId) {
  const match = await getChampionshipMatch(matchId, userId);
  await prisma.match.delete({ where: { id: match.id } });
  return { ok: true };
}

function emptyStats() {
  return {
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    points: 0,
  };
}

async function computeGroupStandingsForGroup(group) {
  const stats = new Map(
    (group.teams ?? []).map((gt) => [
      gt.teamId,
      { teamId: gt.teamId, team: gt.team, ...emptyStats() },
    ]),
  );

  const matches = await prisma.match.findMany({
    where: {
      groupId: group.id,
      stage: "GROUP_STAGE",
      status: "FINISHED",
    },
  });

  for (const m of matches) {
    const home = stats.get(m.homeTeamId);
    const away = stats.get(m.awayTeamId);
    if (!home || !away) continue;
    home.played += 1;
    away.played += 1;
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;
    if (m.homeScore > m.awayScore) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (m.homeScore < m.awayScore) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  const rows = [...stats.values()].map((r) => ({
    ...r,
    goalDiff: r.goalsFor - r.goalsAgainst,
  }));

  rows.sort((a, b) => {
    const byStats = compareStandingStats(a, b);
    if (byStats !== 0) return byStats;
    return a.team.name.localeCompare(b.team.name, "az");
  });

  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

export async function getGroupStandings(groupId, userId) {
  const id = parseId(groupId, "groupId");
  const group = await prisma.championshipGroup.findUnique({
    where: { id },
    include: {
      championship: true,
      teams: { include: { team: { select: teamBrief } }, orderBy: { seed: "asc" } },
    },
  });
  if (!group) throw httpError("Group not found", 404);
  if (group.championship.createdById !== userId) {
    throw httpError("Forbidden", 403);
  }
  return computeGroupStandingsForGroup(group);
}

export async function getChampionshipStandings(championshipId, userId) {
  const c = await getOwnedChampionship(championshipId, userId);
  const result = [];
  for (const g of c.groups) {
    const standings = await getGroupStandings(g.id, userId);
    result.push({ groupId: g.id, groupName: g.name, qualifyCount: g.qualifyCount, standings });
  }
  return result;
}

async function assertGroupStageComplete(championshipId) {
  const unfinished = await prisma.match.count({
    where: {
      championshipId: Number(championshipId),
      stage: "GROUP_STAGE",
      status: { notIn: ["FINISHED", "CANCELLED"] },
    },
  });
  if (unfinished > 0) {
    throw httpError(
      `Qrup mərhələsi bitməyib: ${unfinished} oyun hələ tamamlanmayıb`,
    );
  }
}

async function loadPlayoffGroups(championshipId, userId, tieBreakTeamIds = []) {
  await assertGroupStageComplete(championshipId);
  const standingsByGroup = await getChampionshipStandings(championshipId, userId);
  if (![2, 3, 4].includes(standingsByGroup.length)) {
    throw httpError("Playoff 2, 3 və ya 4 qrup üçün avtomatik formalaşır");
  }

  return standingsByGroup.map((block, index) => {
    const { first, second } = pickGroupTopTwo(
      block.standings,
      block.groupName,
      tieBreakTeamIds,
    );
    return {
      groupId: block.groupId,
      name: block.groupName,
      letter: groupLetterFromName(block.groupName, index),
      first: {
        ...first,
        name: first.team?.name,
      },
      second: {
        ...second,
        name: second.team?.name,
      },
    };
  });
}

function parseTieBreakIds(raw) {
  if (!Array.isArray(raw)) return [];
  const ids = [];
  const seen = new Set();
  for (const value of raw) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function winnerSeedAndLabel(match, meta) {
  if (!meta) return { seed: null, label: null };
  if (match.winnerTeamId === match.homeTeamId) {
    return { seed: meta.homeSeed ?? null, label: meta.homeLabel ?? null };
  }
  return { seed: meta.awaySeed ?? null, label: meta.awayLabel ?? null };
}

async function createPlayoffSlotMatch(tx, { championshipId, userId, row }) {
  if (row.homeTeamId === row.awayTeamId) {
    throw httpError("Playoff-da eyni komanda iki slotda ola bilməz");
  }
  const clash = await tx.match.findFirst({
    where: {
      championshipId,
      stage: row.stage,
      status: { not: "CANCELLED" },
      OR: [
        { homeTeamId: { in: [row.homeTeamId, row.awayTeamId] } },
        { awayTeamId: { in: [row.homeTeamId, row.awayTeamId] } },
      ],
    },
    select: { id: true },
  });
  if (clash) {
    throw httpError("Playoff-da eyni komanda iki slotda ola bilməz");
  }
  return tx.match.create({
    data: {
      championshipId,
      homeTeamId: row.homeTeamId,
      awayTeamId: row.awayTeamId,
      round: row.slot + 1,
      stage: row.stage,
      matchType: "CHAMPIONSHIP",
      status: "SCHEDULED",
      createdById: userId ?? undefined,
      notes: playoffNotes({
        slot: row.slot,
        homeLabel: row.homeLabel,
        awayLabel: row.awayLabel,
        homeSeed: row.homeSeed,
        awaySeed: row.awaySeed,
        feeds: row.feeds,
        pairedWith: row.pairedWith,
      }),
    },
    select: { id: true },
  });
}

export async function startPlayoff(
  championshipId,
  userId,
  { playoffOnly = false, tieBreakTeamIds = [] } = {},
) {
  const c = await getOwnedChampionship(championshipId, userId);
  const resolvedTieBreak = parseTieBreakIds(tieBreakTeamIds);

  if (playoffOnly && c.format !== "PLAYOFF_ONLY") {
    throw httpError(
      "Create a playoff-only championship to skip groups (format: PLAYOFF_ONLY)",
    );
  }

  const isPlayoffOnly = c.format === "PLAYOFF_ONLY";
  let plan;
  let qualifiedTeamIds;

  if (isPlayoffOnly) {
    if (!["DRAFT", "REGISTRATION", "PLAYOFF"].includes(c.status)) {
      throw httpError("Playoff can only start from draft or registration");
    }
    const teamIds = c.teams.map((t) => t.teamId);
    if (!PLAYOFF_ONLY_SIZES.includes(teamIds.length)) {
      throw httpError(
        `Playoff-only requires exactly 4, 8, or 16 teams (currently ${teamIds.length})`,
      );
    }
    if (c.maxTeams != null && teamIds.length !== c.maxTeams) {
      throw httpError(
        `Add exactly ${c.maxTeams} teams before starting playoff (currently ${teamIds.length})`,
      );
    }
    plan = buildLinearPlayoffPlan(teamIds);
    qualifiedTeamIds = teamIds;
  } else {
    if (!["GROUP_STAGE", "PLAYOFF"].includes(c.status)) {
      throw httpError("Finish group stage before playoffs");
    }
    const groups = await loadPlayoffGroups(c.id, userId, resolvedTieBreak);
    plan = buildGroupPlayoffPlan(groups, { tieBreakTeamIds: resolvedTieBreak });
    qualifiedTeamIds = plan.seeds.map((s) => s.teamId);
  }

  const createdIds = await prisma.$transaction(
    async (tx) => {
      await tx.match.deleteMany({
        where: {
          championshipId: c.id,
          stage: { not: "GROUP_STAGE" },
          status: { in: ["SCHEDULED", "POSTPONED"] },
        },
      });

      const liveOrFinished = await tx.match.count({
        where: {
          championshipId: c.id,
          stage: { not: "GROUP_STAGE" },
          status: { in: ["LIVE", "FINISHED"] },
        },
      });
      if (liveOrFinished > 0) {
        throw httpError("Playoff already in progress — cannot regenerate");
      }

      await tx.match.deleteMany({
        where: {
          championshipId: c.id,
          stage: { not: "GROUP_STAGE" },
        },
      });

      const ids = [];
      for (const row of plan.createNow) {
        const m = await createPlayoffSlotMatch(tx, {
          championshipId: c.id,
          userId,
          row,
        });
        ids.push(m.id);
      }

      await tx.championship.update({
        where: { id: c.id },
        data: {
          status: "PLAYOFF",
          format: isPlayoffOnly ? "PLAYOFF_ONLY" : c.format,
        },
      });

      return ids;
    },
    { maxWait: 10000, timeout: 30000 },
  );

  const matches =
    createdIds.length > 0
      ? await prisma.match.findMany({
          where: { id: { in: createdIds } },
          include: matchInclude,
          orderBy: [{ stage: "asc" }, { round: "asc" }, { id: "asc" }],
        })
      : [];

  return {
    qualifiedTeamIds,
    matches,
    seeds: plan.seeds,
    format: plan.format,
    groupCount: plan.groupCount,
    seeding: {
      teamCount: qualifiedTeamIds.length,
      prelimMatchCount: plan.createNow.filter((m) => m.stage === "PRELIMINARY")
        .length,
      openingStage: plan.createNow[0]?.stage ?? null,
    },
  };
}

async function fillPlayoffFeed(finishedMatch, meta) {
  if (!finishedMatch.championshipId || !finishedMatch.winnerTeamId || !meta?.feeds) {
    return;
  }

  const championshipId = finishedMatch.championshipId;
  const { stage, slot, side } = meta.feeds;
  if (!stage || slot == null || !side) return;

  const existing = await prisma.match.findFirst({
    where: {
      championshipId,
      stage,
      round: slot + 1,
      status: { not: "CANCELLED" },
    },
  });
  if (existing) return;

  let homeTeamId;
  let awayTeamId;
  let homeLabel;
  let awayLabel;
  let homeSeed;
  let awaySeed;
  const won = winnerSeedAndLabel(finishedMatch, meta);

  if (meta.pairedWith?.teamId) {
    const bye = meta.pairedWith;
    if (bye.teamId === finishedMatch.winnerTeamId) {
      throw httpError("Playoff-da eyni komanda iki slotda ola bilməz");
    }
    if (side === "away") {
      homeTeamId = bye.teamId;
      homeLabel = bye.label ?? null;
      homeSeed = bye.seed ?? null;
      awayTeamId = finishedMatch.winnerTeamId;
      awayLabel = won.label ?? `P${(meta.slot ?? 0) + 1} qalibi`;
      awaySeed = won.seed;
    } else {
      homeTeamId = finishedMatch.winnerTeamId;
      homeLabel = won.label;
      homeSeed = won.seed;
      awayTeamId = bye.teamId;
      awayLabel = bye.label ?? null;
      awaySeed = bye.seed ?? null;
    }
  } else {
    const stageMates = await prisma.match.findMany({
      where: {
        championshipId,
        stage: finishedMatch.stage,
        status: { not: "CANCELLED" },
      },
    });
    const sibling = stageMates.find((m) => {
      if (m.id === finishedMatch.id) return false;
      const n = parsePlayoffNotes(m.notes);
      return n?.feeds?.stage === stage && n?.feeds?.slot === slot;
    });
    if (!sibling || sibling.status !== "FINISHED" || !sibling.winnerTeamId) {
      return;
    }
    const sibMeta = parsePlayoffNotes(sibling.notes);
    const sibWon = winnerSeedAndLabel(sibling, sibMeta);
    if (side === "home") {
      homeTeamId = finishedMatch.winnerTeamId;
      homeLabel = won.label;
      homeSeed = won.seed;
      awayTeamId = sibling.winnerTeamId;
      awayLabel = sibWon.label;
      awaySeed = sibWon.seed;
    } else {
      homeTeamId = sibling.winnerTeamId;
      homeLabel = sibWon.label;
      homeSeed = sibWon.seed;
      awayTeamId = finishedMatch.winnerTeamId;
      awayLabel = won.label;
      awaySeed = won.seed;
    }
  }

  if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) return;

  const furtherStage = nextStageAfter(stage);
  const furtherFeeds = furtherStage
    ? {
        stage: furtherStage,
        slot: Math.floor(slot / 2),
        side: slot % 2 === 0 ? "home" : "away",
      }
    : null;

  await createPlayoffSlotMatch(prisma, {
    championshipId,
    row: {
      stage,
      slot,
      homeTeamId,
      awayTeamId,
      homeLabel,
      awayLabel,
      homeSeed,
      awaySeed,
      feeds: furtherFeeds,
      pairedWith: null,
    },
  });
}

async function completeIfFinalDone(championshipId) {
  const finals = await prisma.match.findMany({
    where: { championshipId, stage: "FINAL", status: { not: "CANCELLED" } },
  });
  if (finals.length > 0 && finals.every((m) => m.status === "FINISHED")) {
    await prisma.championship.update({
      where: { id: championshipId },
      data: { status: "COMPLETED" },
    });
  }
}

/**
 * After a match finishes, place the winner into the next playoff slot.
 */
export async function onChampionshipMatchFinished(matchId) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { championship: true },
  });
  if (!match?.championshipId || match.status !== "FINISHED") return;
  if (!match.stage || match.stage === "GROUP_STAGE") return;

  if (match.stage === "FINAL") {
    await completeIfFinalDone(match.championshipId);
    return;
  }

  const meta = parsePlayoffNotes(match.notes);
  if (meta?.feeds) {
    try {
      await fillPlayoffFeed(match, meta);
    } catch (err) {
      if (err.status === 400) return;
      throw err;
    }
    return;
  }

  await maybeCreateNextPlayoffRound(match.championshipId, match.stage);
}

async function maybeCreateNextPlayoffRound(championshipId, stage) {
  if (!stage || stage === "GROUP_STAGE" || stage === "PRELIMINARY") return;
  if (stage === "FINAL") {
    await completeIfFinalDone(championshipId);
    return;
  }

  const roundMatches = await prisma.match.findMany({
    where: { championshipId, stage, status: { not: "CANCELLED" } },
    orderBy: [{ round: "asc" }, { id: "asc" }],
  });
  if (roundMatches.length === 0) return;

  const nextStage = nextStageAfter(stage);
  if (!nextStage) return;

  for (let i = 0; i + 1 < roundMatches.length; i += 2) {
    const a = roundMatches[i];
    const b = roundMatches[i + 1];
    if (a.status !== "FINISHED" || b.status !== "FINISHED") continue;
    if (!a.winnerTeamId || !b.winnerTeamId || a.winnerTeamId === b.winnerTeamId) {
      continue;
    }
    const slot = Math.floor(i / 2);
    const existing = await prisma.match.findFirst({
      where: {
        championshipId,
        stage: nextStage,
        round: slot + 1,
        status: { not: "CANCELLED" },
      },
    });
    if (existing) continue;

    const furtherStage = nextStageAfter(nextStage);
    await createPlayoffSlotMatch(prisma, {
      championshipId,
      row: {
        stage: nextStage,
        slot,
        homeTeamId: a.winnerTeamId,
        awayTeamId: b.winnerTeamId,
        homeLabel: null,
        awayLabel: null,
        homeSeed: null,
        awaySeed: null,
        feeds: furtherStage
          ? {
              stage: furtherStage,
              slot: Math.floor(slot / 2),
              side: slot % 2 === 0 ? "home" : "away",
            }
          : null,
        pairedWith: null,
      },
    });
  }
}

export async function updateChampionshipMatchAndAdvance(matchId, userId, body) {
  const updated = await updateChampionshipMatch(matchId, userId, body);
  if (updated.status === "FINISHED") {
    await onChampionshipMatchFinished(updated.id);
    return getChampionshipMatch(updated.id, userId);
  }
  return updated;
}

const PLAYOFF_STAGE_ORDER = [
  "PRELIMINARY",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "FINAL",
];

const VISIBLE_STATUSES = [
  "REGISTRATION",
  "GROUP_STAGE",
  "PLAYOFF",
  "COMPLETED",
  "CANCELLED",
];

function userTeamWhere(userId) {
  return {
    OR: [{ captainId: userId }, { players: { some: { userId } } }],
  };
}

async function getUserTeamIds(userId) {
  const teams = await prisma.team.findMany({
    where: userTeamWhere(userId),
    select: { id: true },
  });
  return new Set(teams.map((t) => t.id));
}

function deriveCurrentStage(status, matches = []) {
  if (status === "GROUP_STAGE") return "GROUP_STAGE";
  if (status === "COMPLETED") return "FINAL";
  if (status !== "PLAYOFF") return null;

  const playoff = matches.filter((m) => m.stage && m.stage !== "GROUP_STAGE");
  for (const stage of PLAYOFF_STAGE_ORDER) {
    const rows = playoff.filter((m) => m.stage === stage);
    if (
      rows.some((m) => m.status !== "FINISHED" && m.status !== "CANCELLED")
    ) {
      return stage;
    }
  }
  for (let i = PLAYOFF_STAGE_ORDER.length - 1; i >= 0; i -= 1) {
    if (playoff.some((m) => m.stage === PLAYOFF_STAGE_ORDER[i])) {
      return PLAYOFF_STAGE_ORDER[i];
    }
  }
  return null;
}

function progressFromMatches(matches = []) {
  return {
    total: matches.length,
    finished: matches.filter((m) => m.status === "FINISHED").length,
    live: matches.filter((m) => m.status === "LIVE").length,
  };
}

async function getVisibleChampionshipRecord(championshipId) {
  const id = parseId(championshipId, "championshipId");
  const c = await prisma.championship.findUnique({
    where: { id },
    include: championshipInclude,
  });
  if (!c || c.status === "DRAFT") {
    throw httpError("Championship not found", 404);
  }
  return c;
}

function withViewerFields(championship, userTeamIds, matchRows) {
  const myTeams = (championship.teams ?? [])
    .filter((row) => userTeamIds.has(row.teamId))
    .map((row) => row.team);
  return {
    ...championship,
    currentStage: deriveCurrentStage(championship.status, matchRows),
    progress: progressFromMatches(matchRows),
    myTeams,
  };
}

export async function listVisibleChampionships(userId) {
  const userTeamIds = await getUserTeamIds(userId);
  if (userTeamIds.size === 0) return [];
  const rows = await prisma.championship.findMany({
    where: {
      status: { in: VISIBLE_STATUSES.filter((s) => s !== "CANCELLED") },
      sport: { code: "FOOTBALL" },
      teams: {
        some: {
          teamId: { in: [...userTeamIds] },
        },
      },
    },
    include: championshipInclude,
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
  });

  const ids = rows.map((r) => r.id);
  const matchRows =
    ids.length === 0
      ? []
      : await prisma.match.findMany({
          where: { championshipId: { in: ids } },
          select: {
            championshipId: true,
            status: true,
            stage: true,
          },
        });

  const byChamp = new Map();
  for (const m of matchRows) {
    const list = byChamp.get(m.championshipId) ?? [];
    list.push(m);
    byChamp.set(m.championshipId, list);
  }

  return rows.map((c) =>
    withViewerFields(formatChampionship(c), userTeamIds, byChamp.get(c.id) ?? []),
  );
}

export async function getVisibleChampionship(championshipId, userId) {
  const c = await getVisibleChampionshipRecord(championshipId);
  const userTeamIds = await getUserTeamIds(userId);
  const matchRows = await prisma.match.findMany({
    where: { championshipId: c.id },
    select: { status: true, stage: true },
  });
  return withViewerFields(formatChampionship(c), userTeamIds, matchRows);
}

export async function getVisibleChampionshipStandings(championshipId) {
  const c = await getVisibleChampionshipRecord(championshipId);
  const result = [];
  for (const g of c.groups ?? []) {
    const standings = await computeGroupStandingsForGroup(g);
    result.push({
      groupId: g.id,
      groupName: g.name,
      qualifyCount: g.qualifyCount,
      standings,
    });
  }
  return result;
}

export async function listVisibleChampionshipMatches(championshipId, query = {}) {
  const c = await getVisibleChampionshipRecord(championshipId);
  const where = { championshipId: c.id };
  if (query.groupId) where.groupId = Number(query.groupId);
  if (query.stage) where.stage = query.stage;
  if (query.status) where.status = query.status;

  return prisma.match.findMany({
    where,
    include: matchInclude,
    orderBy: [{ scheduledAt: { sort: "asc", nulls: "first" } }, { id: "asc" }],
  });
}

export async function getVisibleChampionshipMatch(matchId) {
  const id = parseId(matchId, "matchId");
  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      ...matchInclude,
      championship: { select: { id: true, name: true, status: true } },
    },
  });
  if (!match || !match.championshipId || match.championship?.status === "DRAFT") {
    throw httpError("Match not found", 404);
  }
  return match;
}

export async function getVisibleChampionshipStatistics(championshipId) {
  const c = await getVisibleChampionshipRecord(championshipId);
  const statsMap = await getPlayerStatsMap({ championshipId: c.id });

  const players = await prisma.player.findMany({
    where: {
      team: {
        championshipTeams: { some: { championshipId: c.id } },
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      shirtNumber: true,
      photo: true,
      teamId: true,
      team: { select: teamBrief },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const finishedMatches = await prisma.match.findMany({
    where: { championshipId: c.id, status: "FINISHED" },
    select: { homeTeamId: true, awayTeamId: true },
  });
  const teamMatchCount = new Map();
  for (const m of finishedMatches) {
    teamMatchCount.set(
      m.homeTeamId,
      (teamMatchCount.get(m.homeTeamId) || 0) + 1,
    );
    teamMatchCount.set(
      m.awayTeamId,
      (teamMatchCount.get(m.awayTeamId) || 0) + 1,
    );
  }

  return attachPlayerStats(players, statsMap).map((player) => {
    const matchesPlayed = teamMatchCount.get(player.teamId) || 0;
    return {
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      shirtNumber: player.shirtNumber,
      photo: player.photo,
      teamId: player.teamId,
      team: player.team,
      goals: player.goals,
      assists: player.assists,
      matchesPlayed,
      goalsPerMatch:
        matchesPlayed > 0
          ? Math.round((player.goals / matchesPlayed) * 100) / 100
          : 0,
    };
  });
}
