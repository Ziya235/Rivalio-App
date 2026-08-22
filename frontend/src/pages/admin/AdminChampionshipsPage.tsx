import { Medal } from "lucide-react";
import { AdminPageShell } from "../../components/admin/AdminLayout";

export function AdminChampionshipsPage() {
  return (
    <AdminPageShell
      title="Çempionatlar"
      subtitle="Bu bölmənin strukturu tezliklə hazırlanacaq."
    >
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Medal className="h-7 w-7" />
        </span>
        <p className="text-lg font-extrabold text-ink">Tezliklə</p>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          Çempionat idarəetməsi hələ aktiv deyil. Futbol üçün liqa və oyun
          axınından istifadə edin.
        </p>
      </div>
    </AdminPageShell>
  );
}
