import { IClientAppointment } from '../../interfaces/client-appointment.interface';
import { filterAndSortAppointments } from './appointment-list.utils';

const appointment = (
  id: string,
  status: IClientAppointment['status'],
  startAt: string,
): IClientAppointment => ({
  id,
  title: id,
  startAt,
  startTime: startAt,
  endTime: startAt,
  status,
  calendarSyncStatus: 'not_synced',
});

describe('filterAndSortAppointments', () => {
  const appointments = [
    appointment('cancelled', 'cancelled', '2026-07-16T10:00:00.000Z'),
    appointment('completed', 'completed', '2026-07-17T10:00:00.000Z'),
    appointment('expired', 'expired', '2026-07-15T10:00:00.000Z'),
    appointment('scheduled-later', 'scheduled', '2026-07-20T10:00:00.000Z'),
    appointment('scheduled-next', 'scheduled', '2026-07-18T10:00:00.000Z'),
  ];

  it('hides cancelled appointments by default and prioritizes active work', () => {
    expect(filterAndSortAppointments(appointments, 'not-cancelled').map(({ id }) => id)).toEqual([
      'scheduled-next',
      'scheduled-later',
      'expired',
      'completed',
    ]);
  });

  it('can show only cancelled appointments', () => {
    expect(filterAndSortAppointments(appointments, 'cancelled').map(({ id }) => id)).toEqual([
      'cancelled',
    ]);
  });

  it('places cancelled appointments last when all statuses are visible', () => {
    expect(filterAndSortAppointments(appointments, 'all').at(-1)?.id).toBe('cancelled');
  });
});
