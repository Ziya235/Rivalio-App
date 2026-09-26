import { AdminModal, ModalCancelButton } from "../../../../components/admin/AdminModal";
import type { PlayoffTieGroup } from "../../../../types/championship";

export function TieBreakModal({
  tieGroups,
  tieOrders,
  busy,
  onClose,
  onMove,
  onSubmit,
}: {
  tieGroups: PlayoffTieGroup[] | null;
  tieOrders: Record<string, number[]>;
  busy: boolean;
  onClose: () => void;
  onMove: (groupId: string, index: number, dir: -1 | 1) => void;
  onSubmit: () => void;
}) {
  return (
    <AdminModal
      open={tieGroups != null}
      title="Playoff bərabərliyi"
      onClose={onClose}
      footer={
        <>
          <ModalCancelButton onClick={onClose} disabled={busy} />
          <button
            type="button"
            disabled={busy}
            onClick={onSubmit}
            className="inline-flex items-center rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            Sıralamanı təsdiq et
          </button>
        </>
      }
    >
      <p className="mb-4 text-sm text-slate-600">
        Bütün statistikalar eynidir. Yuxarıdakı komanda daha yüksək seed alır.
      </p>
      {tieGroups?.map((group) => {
        const order = tieOrders[group.id] ?? group.teams.map((team) => team.teamId);
        return (
          <div key={group.id} className="mb-4">
            <p className="mb-2 text-sm font-bold text-ink">{group.title}</p>
            <ul className="space-y-1.5">
              {order.map((teamId, index) => {
                const team = group.teams.find((item) => item.teamId === teamId);
                if (!team) return null;
                return (
                  <li
                    key={teamId}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {index + 1}. {team.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {team.points} xal · TF {team.goalDiff} · {team.goalsFor} qol · {team.won}{" "}
                        qələbə
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => onMove(group.id, index, -1)}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={index === order.length - 1}
                        onClick={() => onMove(group.id, index, 1)}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </AdminModal>
  );
}
