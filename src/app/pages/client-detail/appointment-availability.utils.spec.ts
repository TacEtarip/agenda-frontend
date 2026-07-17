import { describe, expect, it } from 'vitest';
import {
  appointmentAvailabilityMessage,
  availabilityStateFromResult,
} from './appointment-availability.utils';

describe('appointment availability view state', () => {
  it('reports an available slot checked against Google', () => {
    const state = availabilityStateFromResult({
      available: true,
      externalCalendarChecked: true,
      conflicts: [],
    });

    expect(state.status).toBe('available');
    expect(appointmentAvailabilityMessage(state)).toContain('Google Calendar');
  });

  it('does not expose details about a Google conflict', () => {
    const state = availabilityStateFromResult({
      available: false,
      externalCalendarChecked: true,
      conflicts: [
        {
          source: 'google',
          startTime: '2026-07-20T15:00:00.000Z',
          endTime: '2026-07-20T16:00:00.000Z',
        },
      ],
    });

    expect(appointmentAvailabilityMessage(state)).toBe(
      'Google Calendar indica que este horario está ocupado.',
    );
  });

  it('distinguishes a conflict with another Agenda appointment', () => {
    const state = availabilityStateFromResult({
      available: false,
      externalCalendarChecked: false,
      conflicts: [
        {
          source: 'agenda',
          startTime: '2026-07-20T15:00:00.000Z',
          endTime: '2026-07-20T16:00:00.000Z',
          appointmentId: 'appointment-2',
        },
      ],
    });

    expect(appointmentAvailabilityMessage(state)).toContain('otra cita programada');
  });
});
