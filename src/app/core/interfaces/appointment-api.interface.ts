import { AppointmentStatus } from '../../types/appointment-status.type';
import { CalendarSyncStatus } from '../../types/calendar-sync-status.type';

export interface IAppointmentScheduleConflictApi {
  id: string;
  source: 'google';
  conflictStartTime: string;
  conflictEndTime: string;
  detectedAt: string;
}

export interface IAppointmentApi {
  id: string;
  clientId: string;
  userId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  externalEventId?: string;
  externalCalendarId?: string;
  calendarSyncStatus?: CalendarSyncStatus;
  calendarSyncError?: string;
  calendarSyncedAt?: string;
  scheduleConflicts?: IAppointmentScheduleConflictApi[];
}
