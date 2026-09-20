import type { FormEvent } from "react";
import { Button, Input, SelectField } from "../../../components/ui";
import { Modal } from "./Modal";

export function CreatePlayerSearchModal({
  open,
  light,
  busy,
  captainOptions,
  psTeamId,
  psVenue,
  psWhen,
  psNeeded,
  psNotes,
  onClose,
  onSubmit,
  onTeamIdChange,
  onVenueChange,
  onWhenChange,
  onNeededChange,
  onNotesChange,
}: {
  open: boolean;
  light: boolean;
  busy: boolean;
  captainOptions: { label: string; value: string }[];
  psTeamId: string;
  psVenue: string;
  psWhen: string;
  psNeeded: string;
  psNotes: string;
  onClose: () => void;
  onSubmit: () => void;
  onTeamIdChange: (value: string) => void;
  onVenueChange: (value: string) => void;
  onWhenChange: (value: string) => void;
  onNeededChange: (value: string) => void;
  onNotesChange: (value: string) => void;
}) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void onSubmit();
  };

  return (
    <Modal
      open={open}
      title="Yoldaşlıq oyunu üçün oyunçu axtar"
      onClose={onClose}
      light={light}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Ləğv et
          </Button>
          <Button disabled={busy || !psVenue.trim()} onClick={() => void onSubmit()}>
            Yarat
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <SelectField
          label="Öz komandanız"
          value={psTeamId}
          onChange={onTeamIdChange}
          options={captainOptions}
          light={light}
        />
        <Input
          label="Yer *"
          value={psVenue}
          onChange={onVenueChange}
          placeholder="Azfar Arena"
          light={light}
        />
        <Input
          label="Tarix / saat"
          type="datetime-local"
          value={psWhen}
          onChange={onWhenChange}
          light={light}
        />
        <Input
          label="Lazım olan oyunçu sayı *"
          value={psNeeded}
          onChange={onNeededChange}
          type="number"
          light={light}
        />
        <Input
          label="Qeyd"
          value={psNotes}
          onChange={onNotesChange}
          placeholder="5v5, qapıçı lazımdır..."
          light={light}
        />
      </form>
    </Modal>
  );
}
