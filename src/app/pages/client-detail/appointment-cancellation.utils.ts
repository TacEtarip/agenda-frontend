import { IClientAppointment } from '../../interfaces/client-appointment.interface';

export interface AppointmentCancellationAlertOptions {
  header: string;
  subHeader: string;
  message: string;
  buttons: Array<{
    text: string;
    role: 'cancel' | 'destructive';
    handler?: () => void;
  }>;
}

export function buildAppointmentCancellationAlert(
  appointment: IClientAppointment,
  onConfirm: () => void,
): AppointmentCancellationAlertOptions {
  const hasExternalCalendarEvent = Boolean(appointment.externalEventId);

  return {
    header: 'Cancelar cita',
    subHeader: appointment.title,
    message: hasExternalCalendarEvent
      ? 'Esta cita está sincronizada con un calendario externo. Al cancelarla, el evento también se eliminará de ese calendario.'
      : 'La cita quedará marcada como cancelada.',
    buttons: [
      { text: 'Volver', role: 'cancel' },
      { text: 'Sí, cancelar cita', role: 'destructive', handler: onConfirm },
    ],
  };
}
