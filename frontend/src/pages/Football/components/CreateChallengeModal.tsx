import type { FormEvent } from "react";
import { Button, Input, SelectField } from "../../../components/ui";
import { Modal } from "./Modal";

export function CreateChallengeModal({
  open,
  light,
  busy,
  captainOptions,
  chTeamId,
  chVenue,
  chWhen,
  chNotes,
  onClose,
  onSubmit,
  onTeamIdChange,
  onVenueChange,
  onWhenChange,
  onNotesChange,
}: {
  open: boolean;
  light: boolean;
  busy: boolean;
  captainOptions: { label: string; value: string }[];
  chTeamId: string;
  chVenue: string;
  chWhen: string;
  chNotes: string;
  onClose: () => void;
  onSubmit: () => void;
  onTeamIdChange: (value: string) => void;
  onVenueChange: (value: string) => void;
  onWhenChange: (value: string) => void;
  onNotesChange: (value: string) => void;
}) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void onSubmit();
  };

  return (
    <Modal
      open={open}
      title="Oyun təklifi yarat"
      onClose={onClose}
      light={light}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Ləğv et
          </Button>
          <Button disabled={busy || !chVenue.trim()} onClick={() => void onSubmit()}>
            Yarat
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <SelectField
          label="Komandanız"
          value={chTeamId}
          onChange={onTeamIdChange}
          options={captainOptions}
          light={light}
        />
        <Input
          label="Yer *"
          value={chVenue}
          onChange={onVenueChange}
          placeholder="Azfar Arena"
          light={light}
        />
        <Input
          label="Tarix / saat"
          type="datetime-local"
          value={chWhen}
          onChange={onWhenChange}
          light={light}
        />
        <Input
          label="Qeyd"
          value={chNotes}
          onChange={onNotesChange}
          placeholder="5v5..."
          light={light}
        />
      </form>
    </Modal>
  );
}
