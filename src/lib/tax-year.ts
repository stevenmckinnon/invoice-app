// UK financial (tax) year runs 6 April – 5 April. A date's FY is identified
// by the calendar year it starts in (e.g. 1 Feb 2026 → FY 2025/26).
export const getFyStart = (date: Date): number => {
  const month = date.getMonth();
  const isBeforeApril6 = month < 3 || (month === 3 && date.getDate() < 6);
  return isBeforeApril6 ? date.getFullYear() - 1 : date.getFullYear();
};

// Position within the financial year: 0 = April … 11 = March. 1–5 April
// belongs to the year that's ending, so it lands in that year's last slot.
export const getFyMonthIndex = (date: Date): number =>
  date.getMonth() === 3 && getFyStart(date) < date.getFullYear()
    ? 11
    : (date.getMonth() + 9) % 12;

export const formatFy = (fyStart: number): string =>
  `${fyStart}/${String((fyStart + 1) % 100).padStart(2, "0")}`;
