import { roundUpToNextMinutes, validateAppointmentSchedule } from './appointment-schedule.utils';

describe('appointment schedule validation', () => {
  const now = new Date('2026-07-17T12:10:30');

  it('rejects a start time in the past', () => {
    expect(
      validateAppointmentSchedule(
        new Date('2026-07-17T12:10:00'),
        new Date('2026-07-17T13:10:00'),
        now,
      ),
    ).toContain('pasado');
  });

  it('rejects an end time before the start time', () => {
    expect(
      validateAppointmentSchedule(
        new Date('2026-07-17T13:00:00'),
        new Date('2026-07-17T12:30:00'),
        now,
      ),
    ).toContain('fin');
  });

  it('accepts a future interval', () => {
    expect(
      validateAppointmentSchedule(
        new Date('2026-07-17T13:00:00'),
        new Date('2026-07-17T14:00:00'),
        now,
      ),
    ).toBeNull();
  });

  it('rounds the default start to the next quarter hour', () => {
    expect(roundUpToNextMinutes(now, 15)).toEqual(new Date('2026-07-17T12:15:00'));
    expect(roundUpToNextMinutes(new Date('2026-07-17T12:15:00'), 15)).toEqual(
      new Date('2026-07-17T12:30:00'),
    );
  });
});
