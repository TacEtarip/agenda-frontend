import { IClientAppointment } from '../../interfaces/client-appointment.interface';

export type AppointmentFilter =
  | 'not-cancelled'
  | 'scheduled'
  | 'expired'
  | 'completed'
  | 'cancelled'
  | 'all';

export const APPOINTMENT_FILTER_OPTIONS: ReadonlyArray<{
  value: AppointmentFilter;
  label: string;
}> = [
  { value: 'not-cancelled', label: 'Sin canceladas' },
  { value: 'scheduled', label: 'Programadas' },
  { value: 'expired', label: 'Vencidas' },
  { value: 'completed', label: 'Completadas' },
  { value: 'cancelled', label: 'Canceladas' },
  { value: 'all', label: 'Todas' },
];

const STATUS_PRIORITY: Record<IClientAppointment['status'], number> = {
  scheduled: 0,
  expired: 1,
  completed: 2,
  cancelled: 3,
};

export function filterAndSortAppointments(
  appointments: readonly IClientAppointment[],
  filter: AppointmentFilter,
): IClientAppointment[] {
  return appointments
    .filter((appointment) => {
      if (filter === 'all') return true;
      if (filter === 'not-cancelled') return appointment.status !== 'cancelled';
      return appointment.status === filter;
    })
    .sort((left, right) => {
      const priorityDifference = STATUS_PRIORITY[left.status] - STATUS_PRIORITY[right.status];
      if (priorityDifference !== 0) return priorityDifference;

      const leftTime = Date.parse(left.startAt ?? '');
      const rightTime = Date.parse(right.startAt ?? '');
      const safeLeftTime = Number.isNaN(leftTime) ? 0 : leftTime;
      const safeRightTime = Number.isNaN(rightTime) ? 0 : rightTime;

      return left.status === 'scheduled'
        ? safeLeftTime - safeRightTime
        : safeRightTime - safeLeftTime;
    });
}
