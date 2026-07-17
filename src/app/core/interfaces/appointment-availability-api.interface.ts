export type AppointmentAvailabilitySource = 'agenda' | 'google';

export interface IAppointmentBusyIntervalApi {
  source: AppointmentAvailabilitySource;
  startTime: string;
  endTime: string;
  appointmentId?: string;
}

export interface IAppointmentAvailabilityApi {
  available: boolean;
  externalCalendarChecked: boolean;
  conflicts: IAppointmentBusyIntervalApi[];
}

export interface ICheckAppointmentAvailabilityPayload {
  startTime: string;
  endTime: string;
  excludeAppointmentId?: string;
}
