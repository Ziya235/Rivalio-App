import { type FormEvent, useEffect, useState } from "react";
import {
  AdminModal,
  Field,
  ModalCancelButton,
  ModalForm,
  ModalSubmitButton,
  inputClass,
} from "../../../../components/admin/AdminModal";
import { createChampionship } from "../../../../api/championships";
import type {
  ChampionshipFormat,
  ChampionshipMatchFormat,
  ChampionshipVisibility,
} from "../../../../types/championship";

const PLAYOFF_TEAM_COUNTS = ["4", "8", "16"] as const;

export function CreateChampionshipModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<ChampionshipFormat>("GROUP_AND_PLAYOFF");
  const [matchFormat, setMatchFormat] = useState<ChampionshipMatchFormat>("SINGLE");
  const [maxTeams, setMaxTeams] = useState("8");
  const [startDate, setStartDate] = useState("");
  const [visibility, setVisibility] = useState<ChampionshipVisibility>("PUBLIC");

  useEffect(() => {
    if (!open) return;
    setName("");
    setDescription("");
    setFormat("GROUP_AND_PLAYOFF");
    setMatchFormat("SINGLE");
    setMaxTeams("8");
    setStartDate("");
    setVisibility("PUBLIC");
    setFormError(null);
  }, [open]);

  const handleFormatChange = (next: ChampionshipFormat) => {
    setFormat(next);
    if (next === "PLAYOFF_ONLY") {
      setMaxTeams((prev) =>
        PLAYOFF_TEAM_COUNTS.includes(prev as (typeof PLAYOFF_TEAM_COUNTS)[number])
          ? prev
          : "8",
      );
    }
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setFormError("Ad mütləqdir");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const created = await createChampionship({
        name: name.trim(),
        description: description.trim() || undefined,
        format,
        matchFormat,
        maxTeams: format === "PLAYOFF_ONLY" ? Number(maxTeams) : 20,
        startDate: startDate || undefined,
        visibility,
        sportCode: "FOOTBALL",
      });
      await onCreated(created.id);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Yaradılmadı");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminModal
      open={open}
      title="Yeni çempionat yarat"
      onClose={() => !submitting && onClose()}
      footer={
        <>
          <ModalCancelButton onClick={onClose} disabled={submitting} />
          <ModalSubmitButton
            label="Yarat"
            loading={submitting}
            formId="create-championship"
          />
        </>
      }
    >
      <ModalForm id="create-championship" onSubmit={handleCreate}>
        <Field label="Ad" required>
          <input
            className={inputClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </Field>
        <Field label="Təsvir">
          <textarea
            className={inputClass}
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <Field label="Görünürlük" required>
          <select
            className={inputClass}
            value={visibility}
            onChange={(event) =>
              setVisibility(event.target.value as ChampionshipVisibility)
            }
          >
            <option value="PUBLIC">İctimai</option>
            <option value="PRIVATE">Özəl</option>
          </select>
        </Field>
        <Field label="Format" required>
          <select
            className={inputClass}
            value={format}
            onChange={(event) =>
              handleFormatChange(event.target.value as ChampionshipFormat)
            }
          >
            <option value="GROUP_AND_PLAYOFF">Qrup + Playoff</option>
            <option value="PLAYOFF_ONLY">Yalnız Playoff</option>
          </select>
        </Field>
        <p className="mb-4 text-xs text-slate-500">
          {format === "PLAYOFF_ONLY"
            ? "Yalnız 4, 8 və ya 16 komanda. Başladıqda 1/8 → 1/4 → 1/2 → final mərhələləri komanda sayına görə yaranır."
            : "Əvvəl qrup mərhələsi, sonra playoff. Komandalar 6–20 aralığında əlavə olunur."}
        </p>
        {format === "PLAYOFF_ONLY" ? (
          <Field label="Komanda sayı" required>
            <select
              className={inputClass}
              value={maxTeams}
              onChange={(event) => setMaxTeams(event.target.value)}
            >
              <option value="4">4 (yarımfinal)</option>
              <option value="8">8 (1/4 final)</option>
              <option value="16">16 (1/8 final)</option>
            </select>
          </Field>
        ) : null}
        <Field label="Başlama tarixi">
          <input
            type="date"
            className={inputClass}
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </Field>
        <Field label="Oyun formatı" required>
          <select
            className={inputClass}
            value={matchFormat}
            onChange={(event) =>
              setMatchFormat(event.target.value as ChampionshipMatchFormat)
            }
          >
            <option value="SINGLE">1 oyun</option>
            <option value="HOME_AWAY">Ev-səfər</option>
          </select>
        </Field>
        {formError ? (
          <p className="text-sm font-medium text-rose-600">{formError}</p>
        ) : null}
      </ModalForm>
    </AdminModal>
  );
}
