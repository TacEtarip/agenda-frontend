export interface IDashboardAppointment {
  id: string;
  clientName: string;
  initials: string;
  title: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}
