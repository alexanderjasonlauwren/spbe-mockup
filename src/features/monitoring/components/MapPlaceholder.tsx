import { MapPin } from "lucide-react";

export function MapPlaceholder() {
  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm h-[280px] border-2 border-dashed border-outline-variant flex flex-col items-center justify-center gap-3">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
        <MapPin className="h-6 w-6 text-on-surface-variant" />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-on-surface">
          Peta Distribusi Real-Time
        </p>
        <p className="text-xs text-on-surface-variant mt-1">
          Integrasi Google Maps API diperlukan
        </p>
      </div>
    </div>
  );
}
