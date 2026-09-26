import { type FormEvent, useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import {
  AdminModal,
  Field,
  ModalCancelButton,
  ModalForm,
  ModalSubmitButton,
  inputClass,
} from "../../../../components/admin/AdminModal";
import { createLeague } from "../../../../api/admin";
import { uploadImage } from "../../../../api/teams";

export function CreateLeagueModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const clearLogo = () => {
    setLogoFile(null);
    setLogoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  useEffect(() => {
    if (!open) return;
    setName("");
    setDescription("");
    setVisibility("PUBLIC");
    setFormError(null);
    setLogoFile(null);
    setLogoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (logoInputRef.current) logoInputRef.current.value = "";
  }, [open]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const nameReady = name.trim().length >= 4;

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!nameReady) {
      setFormError("Liqa adı ən azı 4 hərf olmalıdır");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      let logo: string | undefined;
      if (logoFile) {
        logo = await uploadImage(logoFile);
      }
      await createLeague({
        name: name.trim(),
        description: description.trim() || undefined,
        visibility,
        logo,
      });
      await onCreated();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Liqa yaradılmadı");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminModal
      open={open}
      title="Yeni liqa yarat"
      onClose={() => !submitting && onClose()}
      footer={
        <>
          <ModalCancelButton onClick={onClose} disabled={submitting} />
          <ModalSubmitButton
            formId="create-league-form"
            label="Yarat"
            loading={submitting}
            disabled={!nameReady}
          />
        </>
      }
    >
      <ModalForm id="create-league-form" onSubmit={handleCreate}>
        <Field label="Liqa adı" required>
          <input
            className={inputClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="məs. Premier Liqa"
            minLength={4}
            maxLength={80}
            required
          />
          {name.trim().length > 0 && name.trim().length < 4 ? (
            <span className="mt-1 block text-xs font-medium text-rose-600">
              Ən azı 4 hərf
            </span>
          ) : null}
        </Field>
        <Field label="Açıqlama" hint={`${description.length}/300`}>
          <textarea
            className={`${inputClass} min-h-[88px] resize-y`}
            value={description}
            onChange={(event) => setDescription(event.target.value.slice(0, 300))}
            placeholder="Qısa açıqlama yazın..."
            maxLength={300}
          />
        </Field>
        <Field label="Görünürlük">
          <select
            className={inputClass}
            value={visibility}
            onChange={(event) =>
              setVisibility(event.target.value as "PUBLIC" | "PRIVATE")
            }
          >
            <option value="PUBLIC">İctimai</option>
            <option value="PRIVATE">Özəl</option>
          </select>
        </Field>
        <Field label="Liqa şəkli" hint="jpg, png, webp — maksimum 5MB">
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              if (!file.type.startsWith("image/")) {
                setFormError("Yalnız şəkil faylı seçin");
                return;
              }
              if (file.size > 5 * 1024 * 1024) {
                setFormError("Şəkil maksimum 5MB ola bilər");
                return;
              }
              setFormError(null);
              setLogoPreview((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return URL.createObjectURL(file);
              });
              setLogoFile(file);
            }}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 transition hover:border-brand hover:text-brand"
            >
              {logoPreview ? (
                <img src={logoPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full flex-col items-center justify-center gap-1">
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[10px] font-medium">Şəkil</span>
                </span>
              )}
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm text-slate-600">
                {logoFile ? logoFile.name : "Profil şəkli seçin"}
              </p>
              <div className="mt-1.5 flex gap-3">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  {logoFile ? "Dəyiş" : "Şəkil seç"}
                </button>
                {logoFile ? (
                  <button
                    type="button"
                    onClick={clearLogo}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-rose-600"
                  >
                    <X className="h-3 w-3" />
                    Sil
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </Field>
        {formError ? <p className="mb-2 text-sm text-rose-600">{formError}</p> : null}
      </ModalForm>
    </AdminModal>
  );
}
