import type { FormEvent } from "react";
import {
  AdminModal,
  Field,
  ModalCancelButton,
  ModalForm,
  ModalSubmitButton,
  inputClass,
} from "../../../../components/admin/AdminModal";
import type { Match } from "../../../../types/match";
import { minKickoffLocal } from "../helpers";

export function ScheduleMatchModal({
  match,
  scheduleAt,
  scheduleVenue,
  submitting,
  error,
  onClose,
  onChangeAt,
  onChangeVenue,
  onSubmit,
}: {
  match: Match | null;
  scheduleAt: string;
  scheduleVenue: string;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onChangeAt: (value: string) => void;
  onChangeVenue: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <AdminModal
      open={match != null}
      title="Oyun vaxtı və məkan"
      onClose={onClose}
      footer={
        <>
          <ModalCancelButton onClick={onClose} disabled={submitting} />
          <ModalSubmitButton
            label="Yadda saxla"
            loading={submitting}
            formId="schedule-match"
            disabled={!scheduleAt.trim() || !scheduleVenue.trim()}
          />
        </>
      }
    >
      <ModalForm id="schedule-match" onSubmit={onSubmit}>
        {match ? (
          <p className="mb-3 text-sm font-semibold text-ink">
            {match.homeTeam.name} — {match.awayTeam.name}
          </p>
        ) : null}
        <Field label="Oyun vaxtı" required>
          <input
            type="datetime-local"
            className={inputClass}
            value={scheduleAt}
            min={minKickoffLocal()}
            onChange={(event) => onChangeAt(event.target.value)}
            required
          />
        </Field>
        <Field label="Stadion / məkan" required>
          <input
            className={inputClass}
            value={scheduleVenue}
            onChange={(event) => onChangeVenue(event.target.value)}
            placeholder="Tofiq Bəhramov stadionu"
            required
          />
        </Field>
        {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
      </ModalForm>
    </AdminModal>
  );
}
