import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "text-blue-600 dark:text-blue-400",
  iconBgColor = "bg-blue-50 dark:bg-blue-500/10",
}: StatsCardProps) {
  return (
    <Card className="relative overflow-hidden border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 transition-all duration-200 hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-500/50">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
              {title}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white truncate">
              {value}
            </p>
            {change && (
              <div className="flex items-center gap-1">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    changeType === "positive" &&
                      "text-green-600 dark:text-green-400",
                    changeType === "negative" &&
                      "text-red-600 dark:text-red-400",
                    changeType === "neutral" &&
                      "text-gray-600 dark:text-gray-400",
                  )}
                >
                  {changeType === "positive" && "↑ "}
                  {changeType === "negative" && "↓ "}
                  {change}
                </p>
              </div>
            )}
          </div>

          {/* Icon - Fixed size and position */}
          <div
            className={cn(
              "flex items-center justify-center w-14 h-14 rounded-xl shrink-0",
              iconBgColor,
            )}
          >
            <Icon className={cn("w-7 h-7", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
