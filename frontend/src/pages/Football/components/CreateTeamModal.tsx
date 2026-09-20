import type { ChangeEvent, FormEvent, RefObject } from "react";
import { ImagePlus } from "lucide-react";
import { Button, Input } from "../../../components/ui";
import { Modal } from "./Modal";

export function CreateTeamModal({
  open,
  light,
  busy,
  teamName,
  teamCity,
  teamShort,
  teamDesc,
  teamLogoFile,
  teamLogoPreview,
  teamLogoInputRef,
  onClose,
  onSubmit,
  onTeamNameChange,
  onTeamCityChange,
  onTeamShortChange,
  onTeamDescChange,
  onLogoChange,
  onClearLogo,
}: {
  open: boolean;
  light: boolean;
  busy: boolean;
  teamName: string;
  teamCity: string;
  teamShort: string;
  teamDesc: string;
  teamLogoFile: File | null;
  teamLogoPreview: string | null;
  teamLogoInputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onSubmit: () => void;
  onTeamNameChange: (value: string) => void;
  onTeamCityChange: (value: string) => void;
  onTeamShortChange: (value: string) => void;
  onTeamDescChange: (value: string) => void;
  onLogoChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onClearLogo: () => void;
}) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void onSubmit();
  };

  return (
    <Modal
      open={open}
      title="Komanda yarat"
      onClose={onClose}
      light={light}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Ləğv et
          </Button>
          <Button disabled={busy || !teamName.trim()} onClick={() => void onSubmit()}>
            Yarat
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={`text-sm font-medium ${light ? "text-gray-700" : "text-white/80"}`}>
            Komanda loqosu
          </label>
          <input
            ref={teamLogoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={onLogoChange}
          />
          <div className="mt-1.5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => teamLogoInputRef.current?.click()}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-dashed transition-colors ${
                light
                  ? "border-gray-200 bg-gray-50 text-gray-400 hover:border-emerald-400 hover:text-emerald-600"
                  : "border-white/15 bg-[#18181f] text-white/40 hover:border-[#c5f135]/40 hover:text-[#c5f135]"
              }`}
            >
              {teamLogoPreview ? (
                <img
                  src={teamLogoPreview}
                  alt="Komanda loqosu"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full flex-col items-center justify-center gap-1">
                  <ImagePlus size={18} />
                  <span className="text-[10px]">Şəkil</span>
                </span>
              )}
            </button>
            <div className="min-w-0">
              <p className={`text-sm ${light ? "text-gray-700" : "text-white/70"}`}>
                {teamLogoFile ? teamLogoFile.name : "jpg, png, webp (max 5MB)"}
              </p>
              <div className="mt-1.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => teamLogoInputRef.current?.click()}
                  className={`text-xs font-medium ${light ? "text-emerald-600" : "text-[#c5f135]"}`}
                >
                  {teamLogoFile ? "Dəyiş" : "Şəkil seç"}
                </button>
                {teamLogoFile ? (
                  <button
                    type="button"
                    onClick={onClearLogo}
                    className="text-xs font-medium text-rose-400"
                  >
                    Sil
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <Input
          label="Komanda adı *"
          value={teamName}
          onChange={onTeamNameChange}
          placeholder="Bakı Strikerlər"
          light={light}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Şəhər"
            value={teamCity}
            onChange={onTeamCityChange}
            placeholder="Bakı"
            light={light}
          />
          <Input
            label="Qısa ad"
            value={teamShort}
            onChange={onTeamShortChange}
            placeholder="BS"
            light={light}
          />
        </div>
        <Input
          label="Təsvir"
          value={teamDesc}
          onChange={onTeamDescChange}
          placeholder="Qısa təsvir..."
          light={light}
        />
      </form>
    </Modal>
  );
}
