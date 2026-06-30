export interface ICreateAppointmentPayload {
  clientId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
}
