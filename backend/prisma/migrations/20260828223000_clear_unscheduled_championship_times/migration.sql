-- Clear auto-filled kickoff times on unschedulable championship fixtures
-- that never got a venue (generated with a default clock time).
UPDATE "Match"
SET "scheduledAt" = NULL
WHERE "championshipId" IS NOT NULL
  AND "status" = 'SCHEDULED'
  AND "venue" IS NULL;
