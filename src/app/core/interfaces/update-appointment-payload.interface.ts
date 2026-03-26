import { AppointmentStatus } from '../../types/appointment-status.type';
import { ICreateAppointmentPayload } from './create-appointment-payload.interface';

export interface IUpdateAppointmentPayload extends Partial<ICreateAppointmentPayload> {
  status?: AppointmentStatus;
}
