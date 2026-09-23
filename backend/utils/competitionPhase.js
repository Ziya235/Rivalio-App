export const COMPETITION_PHASE_LABEL = {
  PLANNED: "Planlaşdırılır",
  ONGOING: "Davam edir",
  FINISHED: "Başa çatıb",
};

export function championshipPhase(status) {
  if (status === "COMPLETED" || status === "FINISHED" || status === "CANCELLED") {
    return "FINISHED";
  }
  if (status === "GROUP_STAGE" || status === "PLAYOFF" || status === "REGISTRATION") {
    return "ONGOING";
  }
  return "PLANNED";
}

export function leaguePhase(status) {
  if (status === "ACTIVE") return "ONGOING";
  if (status === "FINISHED" || status === "CANCELLED") return "FINISHED";
  return "PLANNED";
}

export function competitionPhaseLabel(phase) {
  return COMPETITION_PHASE_LABEL[phase] ?? COMPETITION_PHASE_LABEL.PLANNED;
}
