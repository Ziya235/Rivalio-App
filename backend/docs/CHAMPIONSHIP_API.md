# Championship API

Base path: `/api/championships`  
Auth: Bearer JWT + `ADMIN` role + `football_create` / `football_update` permission  
Owner: only the championship `createdById` can manage it

Success: `{ success: true, data?, message? }`  
Error: `{ success: false, message }`

---

## Championships

| Method | URL | Auth | Body | Response |
|--------|-----|------|------|----------|
| GET | `/api/championships` | create | — | `Championship[]` (mine) |
| POST | `/api/championships` | create | `{ name, description?, sportCode?, format?, startDate?, endDate?, maxTeams?, defaultQualifyCount?, logo? }` | `Championship` |
| GET | `/api/championships/:id` | create | — | `Championship` (with teams, groups) |
| PATCH | `/api/championships/:id` | update | partial create fields | `Championship` |
| DELETE | `/api/championships/:id` | update | — | `{ ok }` |
| POST | `/api/championships/:id/status` | update | `{ status }` | `Championship` |
| POST | `/api/championships/:id/start-group-stage` | update | — | `Championship` |
| POST | `/api/championships/:id/start-playoff` | update | `{ playoffOnly? }` | `{ qualifiedTeamIds, matches, seeding }` |

### Status transitions

`DRAFT` → `REGISTRATION` | `GROUP_STAGE` | `PLAYOFF` | `CANCELLED`  
`REGISTRATION` → `DRAFT` | `GROUP_STAGE` | `PLAYOFF` | `CANCELLED`  
`GROUP_STAGE` → `PLAYOFF` | `CANCELLED`  
`PLAYOFF` → `COMPLETED` | `CANCELLED`

### Format

`GROUP_AND_PLAYOFF` | `PLAYOFF_ONLY`

- **GROUP_AND_PLAYOFF** — add teams → create groups → start group stage → finish matches → start playoff (qualified teams; non-power-of-2 uses prelims).
- **PLAYOFF_ONLY** — `maxTeams` must be **4, 8, or 16**. Add exactly that many teams → `start-playoff` creates opening round:
  - 16 → `ROUND_OF_16` (1/8)
  - 8 → `QUARTER_FINAL` (1/4)
  - 4 → `SEMI_FINAL` (1/2)
  Next rounds auto-created as matches finish → Final → `COMPLETED`. Groups are not used.

---

## Teams

| Method | URL | Body | Notes |
|--------|-----|------|-------|
| GET | `/:championshipId/teams` | — | Roster |
| POST | `/:championshipId/teams` | `{ teamId }` | 409 if duplicate |
| DELETE | `/:championshipId/teams/:teamId` | — | Also removes from groups |

Only in `DRAFT` / `REGISTRATION`.

---

## Groups

| Method | URL | Body |
|--------|-----|------|
| GET | `/:championshipId/groups` | — |
| POST | `/:championshipId/groups` | `{ groupCount, teamSlots?, perGroupSlots?, qualifyCount, autoAssign? }` |
| PATCH | `/groups/:groupId` | `{ name?, teamSlots?, qualifyCount? }` |
| DELETE | `/groups/:groupId` | — |
| POST | `/groups/:groupId/teams` | `{ teamId }` — one group per championship |
| DELETE | `/groups/:groupId/teams/:teamId` | — |
| GET | `/groups/:groupId/standings` | computed from FINISHED group matches |

`autoAssign: true` balances teams across groups (e.g. 13 teams / 4 groups → 4,3,3,3).

---

## Matches

| Method | URL | Body |
|--------|-----|------|
| GET | `/:championshipId/matches?groupId&stage&status` | — |
| POST | `/:championshipId/matches` | `{ homeTeamId, awayTeamId, scheduledAt, groupId?, round?, venue?, stage? }` |
| POST | `/:championshipId/matches/generate` | `{ groupId? }` — round-robin per group |
| GET | `/matches/:matchId` | — |
| PATCH | `/matches/:matchId` | `{ status?, homeScore?, awayScore?, scheduledAt?, venue?, notes?, minute?, round? }` |
| PUT | `/matches/:matchId/result` | `{ homeScore, awayScore }` → FINISHED + winner + playoff advance |
| DELETE | `/matches/:matchId` | — |

`MatchType`: `CHAMPIONSHIP`  
`MatchStage`: `GROUP_STAGE` | `PRELIMINARY` | `ROUND_OF_16` | `QUARTER_FINAL` | `SEMI_FINAL` | `FINAL`  
`MatchStatus`: `SCHEDULED` | `LIVE` | `FINISHED` | `CANCELLED` | `POSTPONED`

Finishing a playoff match advances winners / creates next round; finishing Final sets championship `COMPLETED`.

---

## Standings

| Method | URL |
|--------|-----|
| GET | `/:championshipId/standings` |
| GET | `/groups/:groupId/standings` |

Points: W=3, D=1, L=0. Sort: points → GD → GF → name.

---

## Errors

| Status | When |
|--------|------|
| 400 | Validation / illegal status transition |
| 401 | Missing/invalid token |
| 403 | Not admin / missing permission / not owner |
| 404 | Not found |
| 409 | Duplicate team or pairing |
| 500 | Unexpected |

---

## DB (Prisma)

- `Championship`, `ChampionshipTeam`, `ChampionshipGroup`, `ChampionshipGroupTeam`
- `Match` extended: `championshipId`, `groupId`, `winnerTeamId`, `stage`, `MatchType.CHAMPIONSHIP`
