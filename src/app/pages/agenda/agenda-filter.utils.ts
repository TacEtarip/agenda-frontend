import { IAppointmentApi } from '../../core/interfaces/appointment-api.interface';
import { AppointmentStatus } from '../../types/appointment-status.type';

export type AgendaStatusFilter = 'active' | 'all' | AppointmentStatus;

export const AGENDA_STATUS_FILTERS: readonly {
  value: AgendaStatusFilter;
  label: string;
}[] = [
  { value: 'active', label: 'Sin canceladas' },
  { value: 'scheduled', label: 'Programadas' },
  { value: 'completed', label: 'Completadas' },
  { value: 'expired', label: 'Vencidas' },
  { value: 'cancelled', label: 'Canceladas' },
  { value: 'all', label: 'Todos los estados' },
];

export function filterAgendaAppointments(
  appointments: readonly IAppointmentApi[],
  status: AgendaStatusFilter,
  clientId: string,
): IAppointmentApi[] {
  return appointments.filter((appointment) => {
    if (clientId !== 'all' && appointment.clientId !== clientId) return false;
    if (status === 'all') return true;
    if (status === 'active') return appointment.status !== 'cancelled';
    return appointment.status === status;
  });
}
