import { AppointmentStatus } from '../types/appointment-status.type';
import { CalendarSyncStatus } from '../types/calendar-sync-status.type';

export interface IClientAppointment {
  id: string;
  title: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  externalEventId?: string;
  externalCalendarId?: string;
  calendarSyncStatus: CalendarSyncStatus;
  calendarSyncError?: string;
  calendarSyncedAt?: string;
}
