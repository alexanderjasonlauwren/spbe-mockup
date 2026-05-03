import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  /** Tailwind bg class for the top accent line, e.g. "bg-amber-500" */
  accentBg?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "text-blue-600 dark:text-blue-400",
  iconBgColor = "bg-blue-50 dark:bg-blue-500/10",
  accentBg = "bg-blue-500",
}: StatsCardProps) {
  return (
    <Card className="relative overflow-hidden border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group">
      {/* Top accent line */}
      <div className={cn("absolute top-0 left-0 right-0 h-0.5", accentBg)} />

      <CardContent className="p-5 pt-5">
        {/* Icon row */}
        <div className="flex items-center justify-between mb-4">
          <div
            className={cn(
              "p-2.5 rounded-xl shrink-0 transition-transform duration-200 group-hover:scale-110",
              iconBgColor,
            )}
          >
            <Icon className={cn("w-5 h-5", iconColor)} />
          </div>

          {changeType === "positive" && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400">
              ↑
            </span>
          )}
          {changeType === "negative" && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400">
              ↓
            </span>
          )}
        </div>

        {/* Value */}
        <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight mb-1">
          {value}
        </p>

        {/* Title */}
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {title}
        </p>

        {/* Change text */}
        {change && (
          <p
            className={cn(
              "text-xs mt-2 font-medium",
              changeType === "positive" && "text-green-600 dark:text-green-400",
              changeType === "negative" && "text-red-600 dark:text-red-400",
              changeType === "neutral" && "text-gray-500 dark:text-gray-400",
            )}
          >
            {change}
          </p>
        )}
      </CardContent>

      {/* Subtle background glow orb */}
      <div
        className={cn(
          "absolute -bottom-4 -right-4 w-20 h-20 rounded-full blur-2xl opacity-20 transition-opacity duration-200 group-hover:opacity-30",
          accentBg,
        )}
      />
    </Card>
  );
}
