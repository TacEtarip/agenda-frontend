import { IAppointmentAvailabilityApi } from '../../core/interfaces/appointment-availability-api.interface';

export type AppointmentAvailabilityStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'conflict'
  | 'error';

export interface AppointmentAvailabilityViewState {
  status: AppointmentAvailabilityStatus;
  result?: IAppointmentAvailabilityApi;
  message?: string;
}

export function availabilityStateFromResult(
  result: IAppointmentAvailabilityApi,
): AppointmentAvailabilityViewState {
  return {
    status: result.available ? 'available' : 'conflict',
    result,
  };
}

export function appointmentAvailabilityMessage(
  state: AppointmentAvailabilityViewState,
): string | null {
  switch (state.status) {
    case 'checking':
      return 'Comprobando disponibilidad en Agenda y calendarios vinculados…';
    case 'available':
      return state.result?.externalCalendarChecked
        ? 'Horario disponible en Agenda y Google Calendar.'
        : 'Horario disponible en Agenda.';
    case 'conflict':
      return state.result?.conflicts.some((conflict) => conflict.source === 'google')
        ? 'Google Calendar indica que este horario está ocupado.'
        : 'Este horario se superpone con otra cita programada en Agenda.';
    case 'error':
      return state.message ?? 'No se pudo comprobar la disponibilidad.';
    default:
      return null;
  }
}
