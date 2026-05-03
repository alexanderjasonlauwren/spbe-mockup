import { getInitials, stringToColor } from "@/lib/utils";
import { StatusBadge, getStatusVariant } from "@/components/common/StatusBadge";
import type { DriverCard } from "../types";

interface DriverCardRowProps {
  cards: DriverCard[];
  isLoading: boolean;
  selectedId?: string;
  onSelect?: (id: string) => void;
}

export function DriverCardRow({
  cards,
  isLoading,
  selectedId,
  onSelect,
}: DriverCardRowProps) {
  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-surface-container-lowest rounded-xl shadow-sm p-5 min-w-[220px] space-y-3 animate-pulse"
          >
            <div className="w-10 h-10 rounded-full bg-slate-200" />
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {cards.map((card) => {
        const bg = stringToColor(card.name);
        return (
          <button
            key={card.id}
            onClick={() => onSelect?.(card.id)}
            className={
              "bg-surface-container-lowest rounded-xl shadow-sm p-5 min-w-[220px] flex-shrink-0 text-left border transition-all " +
              (selectedId === card.id
                ? "border-[#1565C0] ring-2 ring-[#1565C0]/20"
                : "border-transparent hover:border-slate-200")
            }
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black"
                style={{ backgroundColor: bg }}
              >
                {getInitials(card.name)}
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface leading-tight">
                  {card.name}
                </p>
                <p className="text-[10px] text-on-surface-variant">
                  {card.plat}
                </p>
              </div>
            </div>

            <StatusBadge
              variant={getStatusVariant(card.status)}
              label={card.status}
            />

            <div className="mt-3 space-y-1">
              {card.tujuanPangkalan && (
                <p className="text-[10px] text-on-surface-variant">
                  Tujuan:{" "}
                  <span className="font-bold text-on-surface">
                    {card.tujuanPangkalan}
                  </span>
                </p>
              )}
              <p className="text-[10px] text-on-surface-variant">
                {card.armada} • {card.kapasitas} tabung
              </p>
              {card.eta && (
                <p className="text-[10px] text-on-surface-variant">
                  ETA:{" "}
                  <span className="font-bold text-on-surface">{card.eta}</span>
                </p>
              )}
              {card.lokasi && (
                <p className="text-[10px] text-on-surface-variant">
                  Lokasi:{" "}
                  <span className="font-bold text-on-surface">
                    {card.lokasi}
                  </span>
                </p>
              )}
              {card.durasi && (
                <p className="text-[10px] text-on-surface-variant">
                  Durasi:{" "}
                  <span className="font-bold text-on-surface">
                    {card.durasi}
                  </span>
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
