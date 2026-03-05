export interface IClientAppointment {
  id: string;
  title: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}
