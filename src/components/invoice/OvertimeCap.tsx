import { cn } from "@/lib/utils";

import { OT_AFTER_FILL, OT_FIRST_FILL, OT_PX_PER_HOUR } from "./day-fills";

/**
 * A day's overtime drawn as a cap: 1.5x hours outlined at the bottom, 2x
 * hours solid on top, with a card-coloured seam between the two rates. Takes
 * the day's stored split, so it shows what was billed, whatever the tier.
 */
export const OvertimeCap = ({
  at15,
  at2,
  className,
  style,
  showLabel = true,
}: {
  /** Hours billed at 1.5x that day */
  at15: number;
  /** Hours billed at 2x that day */
  at2: number;
  className?: string;
  style?: React.CSSProperties;
  showLabel?: boolean;
}) => (
  <div className={cn("flex flex-col", className)} style={style}>
    {showLabel && (
      <span className="text-warning absolute inset-x-0 bottom-full mb-1 text-center font-mono text-[11px] font-semibold">
        +{at15 + at2}h
      </span>
    )}
    {at2 > 0 && (
      <div
        className={cn(OT_AFTER_FILL, "rounded-t-[inherit]")}
        style={{ height: at2 * OT_PX_PER_HOUR }}
      />
    )}
    {at2 > 0 && at15 > 0 && <div className="bg-card h-px shrink-0" />}
    {at15 > 0 && (
      <div
        className={cn(OT_FIRST_FILL, at2 === 0 && "rounded-t-[inherit]")}
        style={{ height: at15 * OT_PX_PER_HOUR - (at2 > 0 ? 1 : 0) }}
      />
    )}
  </div>
);

/** Each date's stored overtime, split by rate, keyed yyyy-mm-dd */
export const overtimeByDate = (
  entries: Array<{ date: Date | string; hours: number; rateType: string }>,
) => {
  const byDate = new Map<string, { at15: number; at2: number }>();
  for (const entry of entries) {
    const date = (
      entry.date instanceof Date ? entry.date.toISOString() : String(entry.date)
    ).slice(0, 10);
    const day = byDate.get(date) ?? { at15: 0, at2: 0 };
    if (entry.rateType === "1.5x") day.at15 += Number(entry.hours);
    else day.at2 += Number(entry.hours);
    byDate.set(date, day);
  }
  return byDate;
};
