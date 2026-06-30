import { AppointmentStatus } from '../../types/appointment-status.type';

export interface IUpdateAppointmentPayload {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  status?: AppointmentStatus;
  externalEventId?: string;
  meetingUrl?: string;
}
