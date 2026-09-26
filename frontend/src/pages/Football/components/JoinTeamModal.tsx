import { Button, SelectField } from "../../../components/ui";
import type { TeamSummary } from "../../../api/teams";
import { Modal } from "./Modal";

export function JoinTeamModal({
  open,
  light,
  busy,
  targetName,
  teams,
  teamId,
  onTeamIdChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  light: boolean;
  busy: boolean;
  targetName: string;
  teams: TeamSummary[];
  teamId: string;
  onTeamIdChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal
      open={open}
      light={light}
      title="Komanda seçin"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Bağla
          </Button>
          <Button disabled={busy || !teamId} onClick={onSubmit}>
            {busy ? "Göndərilir..." : "Dəvət göndər"}
          </Button>
        </>
      }
    >
      <p className={`mb-3 text-sm ${light ? "text-gray-500" : "text-white/55"}`}>
        {targetName} üçün hansı komanda ilə dəvət göndərmək istəyirsiniz?
      </p>
      <SelectField
        label="Komanda"
        value={teamId}
        onChange={onTeamIdChange}
        options={teams.map((team) => ({ label: team.name, value: String(team.id) }))}
        light={light}
      />
    </Modal>
  );
}
