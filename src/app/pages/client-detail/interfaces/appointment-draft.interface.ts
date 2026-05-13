export interface IAppointmentDraft {
  title: string;
  description: string;
  date: string;
  startHour: string;
  endHour: string;
  requestPaymentLink?: boolean;
}
