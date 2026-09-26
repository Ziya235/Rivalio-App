import type { FormEvent } from "react";
import {
  AdminModal,
  Field,
  ModalCancelButton,
  ModalForm,
  ModalSubmitButton,
  inputClass,
} from "../../../../components/admin/AdminModal";
import type { TeamPlayer } from "../../../../types/league";
import type { Match } from "../../../../types/match";
import { EVENT_MINUTE_MAX, EVENT_MINUTE_MIN } from "../constants";
import { playerName } from "../helpers";

export function EventFormModal({
  open,
  title,
  match,
  eventKind,
  submitting,
  canSubmit,
  formError,
  minute,
  teamId,
  playerId,
  assistPlayerId,
  playerInId,
  playerOutId,
  cardType,
  isOwnGoal,
  note,
  editing,
  players,
  onClose,
  onSubmit,
  onMinute,
  onTeam,
  onPlayer,
  onAssist,
  onPlayerIn,
  onPlayerOut,
  onCardType,
  onOwnGoal,
  onNote,
}: {
  open: boolean;
  title: string;
  match: Match;
  eventKind: "GOAL" | "CARD" | "SUB" | "NOTE";
  submitting: boolean;
  canSubmit: boolean;
  formError: string | null;
  minute: string;
  teamId: number | "";
  playerId: number | "";
  assistPlayerId: number | "";
  playerInId: number | "";
  playerOutId: number | "";
  cardType: "YELLOW_CARD" | "RED_CARD";
  isOwnGoal: boolean;
  note: string;
  editing: boolean;
  players: TeamPlayer[];
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  onMinute: (value: string) => void;
  onTeam: (value: number | "") => void;
  onPlayer: (value: number | "") => void;
  onAssist: (value: number | "") => void;
  onPlayerIn: (value: number | "") => void;
  onPlayerOut: (value: number | "") => void;
  onCardType: (value: "YELLOW_CARD" | "RED_CARD") => void;
  onOwnGoal: (value: boolean) => void;
  onNote: (value: string) => void;
}) {
  return (
    <AdminModal
      open={open}
      title={title}
      onClose={() => !submitting && onClose()}
      footer={
        <>
          <ModalCancelButton onClick={onClose} disabled={submitting} />
          <ModalSubmitButton
            formId="match-event-form"
            label={editing ? "Yadda saxla" : "Əlavə et"}
            loading={submitting}
            disabled={!canSubmit}
          />
        </>
      }
    >
      <ModalForm id="match-event-form" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Dəqiqə" required hint={`${EVENT_MINUTE_MIN}–${EVENT_MINUTE_MAX} arası rəqəm yazın`}>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              className={inputClass}
              value={minute}
              placeholder={`${EVENT_MINUTE_MIN}–${EVENT_MINUTE_MAX}`}
              onChange={(event) => {
                const digits = event.target.value.replace(/\D/g, "").slice(0, 3);
                if (digits === "") {
                  onMinute("");
                  return;
                }
                if (Number(digits) > EVENT_MINUTE_MAX) return;
                onMinute(digits.replace(/^0+(?=\d)/, ""));
              }}
              required
            />
          </Field>
          <Field label="Komanda" required>
            <select
              className={inputClass}
              value={teamId}
              onChange={(event) => {
                onTeam(event.target.value ? Number(event.target.value) : "");
              }}
              required
            >
              <option value="">Seçin...</option>
              <option value={match.homeTeamId}>{match.homeTeam.name}</option>
              <option value={match.awayTeamId}>{match.awayTeam.name}</option>
            </select>
          </Field>
        </div>

        {eventKind === "GOAL" ? (
          <>
            <Field label="Növ" required>
              <select
                className={inputClass}
                value={isOwnGoal ? "OWN_GOAL" : "GOAL"}
                onChange={(event) => onOwnGoal(event.target.value === "OWN_GOAL")}
              >
                <option value="GOAL">Qol</option>
                <option value="OWN_GOAL">Avtoqol</option>
              </select>
            </Field>
            <Field label="Oyunçu" required>
              <select
                className={inputClass}
                value={playerId}
                onChange={(event) => onPlayer(event.target.value ? Number(event.target.value) : "")}
                disabled={!teamId}
                required
              >
                <option value="">Seçin...</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {playerName(player)}
                  </option>
                ))}
              </select>
            </Field>
            {!isOwnGoal ? (
              <Field label="Asist">
                <select
                  className={inputClass}
                  value={assistPlayerId}
                  onChange={(event) =>
                    onAssist(event.target.value ? Number(event.target.value) : "")
                  }
                  disabled={!teamId}
                >
                  <option value="">Yoxdur</option>
                  {players
                    .filter((player) => player.id !== playerId)
                    .map((player) => (
                      <option key={player.id} value={player.id}>
                        {playerName(player)}
                      </option>
                    ))}
                </select>
              </Field>
            ) : null}
          </>
        ) : null}

        {eventKind === "CARD" ? (
          <>
            <Field label="Kart növü" required>
              <select
                className={inputClass}
                value={cardType}
                onChange={(event) =>
                  onCardType(event.target.value as "YELLOW_CARD" | "RED_CARD")
                }
              >
                <option value="YELLOW_CARD">Sarı</option>
                <option value="RED_CARD">Qırmızı</option>
              </select>
            </Field>
            <Field label="Oyunçu" required>
              <select
                className={inputClass}
                value={playerId}
                onChange={(event) => onPlayer(event.target.value ? Number(event.target.value) : "")}
                disabled={!teamId}
                required
              >
                <option value="">Seçin...</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {playerName(player)}
                  </option>
                ))}
              </select>
            </Field>
          </>
        ) : null}

        {eventKind === "SUB" ? (
          <>
            <Field label="Çıxan oyunçu" required>
              <select
                className={inputClass}
                value={playerOutId}
                onChange={(event) =>
                  onPlayerOut(event.target.value ? Number(event.target.value) : "")
                }
                disabled={!teamId}
                required
              >
                <option value="">Seçin...</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {playerName(player)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Daxil olan oyunçu" required>
              <select
                className={inputClass}
                value={playerInId}
                onChange={(event) =>
                  onPlayerIn(event.target.value ? Number(event.target.value) : "")
                }
                disabled={!teamId}
                required
              >
                <option value="">Seçin...</option>
                {players
                  .filter((player) => player.id !== playerOutId)
                  .map((player) => (
                    <option key={player.id} value={player.id}>
                      {playerName(player)}
                    </option>
                  ))}
              </select>
            </Field>
          </>
        ) : null}

        {eventKind === "NOTE" ? (
          <Field label="Mətn">
            <textarea
              className={`${inputClass} min-h-[88px] resize-y`}
              value={note}
              onChange={(event) => onNote(event.target.value)}
              placeholder="Qeyd yazın..."
            />
          </Field>
        ) : null}

        {formError ? <p className="mb-2 text-sm text-rose-600">{formError}</p> : null}
      </ModalForm>
    </AdminModal>
  );
}
