import { AppointmentStatus } from '../types/appointment-status.type';

export interface IClientAppointment {
  id: string;
  title: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  paymentId?: string;
  paymentUrl?: string;
}
