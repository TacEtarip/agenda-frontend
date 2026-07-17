import { describe, expect, it } from 'vitest';
import { IAppointmentApi } from '../../core/interfaces/appointment-api.interface';
import {
  appointmentsOnDay,
  calendarMonthGrid,
  calendarWeek,
  moveCalendarPeriod,
} from './agenda-date.utils';

const appointment = (id: string, startTime: string): IAppointmentApi => ({
  id,
  clientId: 'client-1',
  userId: 'user-1',
  title: id,
  startTime,
  endTime: new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString(),
  status: 'scheduled',
});

describe('agenda date utilities', () => {
  it('builds a Monday-to-Sunday week', () => {
    const days = calendarWeek(new Date(2026, 6, 17));

    expect(days.map((day) => day.getDay())).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(days[0].getDate()).toBe(13);
  });

  it('builds a stable six-week month grid', () => {
    const days = calendarMonthGrid(new Date(2026, 6, 17));

    expect(days).toHaveLength(42);
    expect(days[0].getDay()).toBe(1);
    expect(days.at(-1)?.getDay()).toBe(0);
  });

  it('sorts appointments chronologically inside a day', () => {
    const result = appointmentsOnDay(
      [
        appointment('later', '2026-07-17T17:00:00-05:00'),
        appointment('earlier', '2026-07-17T09:00:00-05:00'),
        appointment('other-day', '2026-07-18T08:00:00-05:00'),
      ],
      new Date(2026, 6, 17),
    );

    expect(result.map(({ id }) => id)).toEqual(['earlier', 'later']);
  });

  it('moves by the selected calendar period', () => {
    const date = new Date(2026, 6, 17);

    expect(moveCalendarPeriod(date, 'day', 1).getDate()).toBe(18);
    expect(moveCalendarPeriod(date, 'week', -1).getDate()).toBe(10);
    expect(moveCalendarPeriod(date, 'month', 1).getMonth()).toBe(7);
  });
});
