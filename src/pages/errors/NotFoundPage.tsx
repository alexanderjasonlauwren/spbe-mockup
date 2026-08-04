import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NAV_GROUPS } from "@/layouts/nav";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl py-10">
      <p className="label text-2xs text-ink-muted">Kesalahan 404</p>
      <h1 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-ink">
        Halaman ini tidak ada
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        Alamat yang Anda buka tidak terdaftar di konsol. Mungkin tautannya sudah
        berubah, atau ada salah ketik pada alamat.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/dashboard">Ke papan berangkat</Link>
        </Button>
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali
        </Button>
      </div>

      <div className="mt-10 border-t border-line pt-6">
        <p className="label mb-4 text-2xs text-ink-muted">Halaman yang tersedia</p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-xs font-semibold text-ink">{group.label}</p>
              <ul className="space-y-1.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className="text-xs text-ink-muted transition-colors hover:text-ink hover:underline hover:decoration-signal hover:decoration-2 hover:underline-offset-4"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
