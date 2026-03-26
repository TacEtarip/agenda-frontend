export interface ICreateAppointmentPayload {
  clientId: string;
  userId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
}
