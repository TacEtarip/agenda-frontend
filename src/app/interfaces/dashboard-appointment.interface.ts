import { AppointmentStatus } from '../types/appointment-status.type';

export interface IDashboardAppointment {
  id: string;
  clientName: string;
  initials: string;
  title: string;
  time: string;
  status: AppointmentStatus;
}
