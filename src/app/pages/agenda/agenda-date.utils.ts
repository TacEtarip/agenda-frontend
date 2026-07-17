import { IAppointmentApi } from '../../core/interfaces/appointment-api.interface';

export type AgendaView = 'day' | 'week' | 'month';

export function normalizeCalendarDate(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12);
}

export function addCalendarDays(value: Date, amount: number): Date {
  const result = normalizeCalendarDate(value);
  result.setDate(result.getDate() + amount);
  return result;
}

export function startOfCalendarWeek(value: Date): Date {
  const result = normalizeCalendarDate(value);
  const mondayOffset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - mondayOffset);
  return result;
}

export function calendarWeek(value: Date): Date[] {
  const start = startOfCalendarWeek(value);
  return Array.from({ length: 7 }, (_, index) => addCalendarDays(start, index));
}

export function calendarMonthGrid(value: Date): Date[] {
  const firstDay = new Date(value.getFullYear(), value.getMonth(), 1, 12);
  const start = startOfCalendarWeek(firstDay);
  return Array.from({ length: 42 }, (_, index) => addCalendarDays(start, index));
}

export function isSameCalendarDay(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export function appointmentsOnDay<T extends IAppointmentApi>(
  appointments: readonly T[],
  day: Date,
): T[] {
  return appointments
    .filter((appointment) => isSameCalendarDay(new Date(appointment.startTime), day))
    .sort(
      (first, second) => new Date(first.startTime).getTime() - new Date(second.startTime).getTime(),
    );
}

export function moveCalendarPeriod(value: Date, view: AgendaView, direction: -1 | 1): Date {
  const current = normalizeCalendarDate(value);
  if (view === 'day') return addCalendarDays(current, direction);
  if (view === 'week') return addCalendarDays(current, direction * 7);
  return new Date(current.getFullYear(), current.getMonth() + direction, 1, 12);
}
