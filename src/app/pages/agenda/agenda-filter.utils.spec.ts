import { IAppointmentApi } from '../../core/interfaces/appointment-api.interface';
import { filterAgendaAppointments } from './agenda-filter.utils';

const appointment = (
  id: string,
  clientId: string,
  status: IAppointmentApi['status'],
): IAppointmentApi => ({
  id,
  clientId,
  userId: 'user-1',
  title: id,
  startTime: '2026-07-20T14:00:00.000Z',
  endTime: '2026-07-20T15:00:00.000Z',
  status,
});

const appointments = [
  appointment('scheduled-a', 'client-a', 'scheduled'),
  appointment('completed-a', 'client-a', 'completed'),
  appointment('cancelled-a', 'client-a', 'cancelled'),
  appointment('scheduled-b', 'client-b', 'scheduled'),
];

describe('filterAgendaAppointments', () => {
  it('hides cancelled appointments by default', () => {
    expect(filterAgendaAppointments(appointments, 'active', 'all').map(({ id }) => id)).toEqual([
      'scheduled-a',
      'completed-a',
      'scheduled-b',
    ]);
  });

  it('combines status and client filters', () => {
    expect(
      filterAgendaAppointments(appointments, 'scheduled', 'client-a').map(({ id }) => id),
    ).toEqual(['scheduled-a']);
  });

  it('can show cancelled appointments explicitly', () => {
    expect(filterAgendaAppointments(appointments, 'cancelled', 'all').map(({ id }) => id)).toEqual([
      'cancelled-a',
    ]);
  });
});
