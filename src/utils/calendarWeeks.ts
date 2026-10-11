export interface CalendarWeekRange {
  startDate: string;
  endDate: string;
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Return every Monday–Sunday calendar week that intersects the given month. */
export function getCalendarWeeksForMonth(year: number, monthIndex: number): CalendarWeekRange[] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const lastOfMonth = new Date(year, monthIndex + 1, 0);
  const firstMonday = new Date(firstOfMonth);
  const offsetFromMonday = (firstMonday.getDay() + 6) % 7;
  firstMonday.setDate(firstMonday.getDate() - offsetFromMonday);

  const weeks: CalendarWeekRange[] = [];
  for (let monday = firstMonday; monday <= lastOfMonth;) {
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    weeks.push({ startDate: formatDateKey(monday), endDate: formatDateKey(sunday) });
    monday = new Date(monday);
    monday.setDate(monday.getDate() + 7);
  }
  return weeks;
}
