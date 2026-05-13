import { AppointmentStatus } from '../../types/appointment-status.type';

export interface IAppointmentApi {
  id: string;
  clientId: string;
  userId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  paymentId?: string;
  paymentUrl?: string;
}
