import { AdminModal } from "../../../../components/admin/AdminModal";

export function FinishLeagueModal({
  open,
  finishing,
  error,
  unfinishedCount,
  onClose,
  onConfirm,
}: {
  open: boolean;
  finishing: boolean;
  error: string | null;
  unfinishedCount: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const blocked = unfinishedCount > 0;

  return (
    <AdminModal
      open={open}
      title={blocked ? "Liqa bitirilə bilməz" : "Liqanı bitir"}
      onClose={() => !finishing && onClose()}
      footer={
        blocked ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Bağla
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onClose}
              disabled={finishing}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Ləğv et
            </button>
            <button
              type="button"
              disabled={finishing}
              onClick={onConfirm}
              className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {finishing ? "Bitirilir..." : "Liqanı bitir"}
            </button>
          </>
        )
      }
    >
      {blocked ? (
        <div className="space-y-2 text-sm leading-relaxed text-slate-700">
          <p className="font-semibold text-ink">Liqada hələ tamamlanmamış oyunlar var.</p>
          <p>Liqanı bitirmək üçün bütün oyunlar tamamlanmalıdır.</p>
          <p className="font-medium text-slate-800">
            {unfinishedCount} oyun hələ keçirilməyib.
          </p>
        </div>
      ) : (
        <div className="space-y-2 text-sm leading-relaxed text-slate-700">
          <p className="font-semibold text-ink">
            Liqanı bitirmək istədiyinizə əminsinizmi?
          </p>
          <p>Bu əməliyyatdan sonra liqa tamamlanmış kimi işarələnəcək.</p>
        </div>
      )}
      {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}
    </AdminModal>
  );
}
