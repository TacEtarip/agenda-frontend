import { describe, expect, it, vi } from 'vitest';
import { IClientAppointment } from '../../interfaces/client-appointment.interface';
import { buildAppointmentCancellationAlert } from './appointment-cancellation.utils';

const appointment: IClientAppointment = {
  id: 'appointment-1',
  title: 'Consulta de seguimiento',
  startTime: '17 jul 2026 · 15:00',
  endTime: '16:00',
  status: 'scheduled',
  calendarSyncStatus: 'not_synced',
  scheduleConflicts: [],
};

describe('buildAppointmentCancellationAlert', () => {
  it('requires confirmation before cancelling a local appointment', () => {
    const onConfirm = vi.fn();
    const options = buildAppointmentCancellationAlert(appointment, onConfirm);

    expect(options.header).toBe('Cancelar cita');
    expect(options.subHeader).toBe(appointment.title);
    expect(options.message).toBe('La cita quedará marcada como cancelada.');
    expect(onConfirm).not.toHaveBeenCalled();

    options.buttons.find((button) => button.role === 'cancel')?.handler?.();
    expect(onConfirm).not.toHaveBeenCalled();

    options.buttons.find((button) => button.role === 'destructive')?.handler?.();
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('warns when the external calendar event will also be deleted', () => {
    const options = buildAppointmentCancellationAlert(
      {
        ...appointment,
        externalEventId: 'google-event-1',
        externalCalendarId: 'primary',
        calendarSyncStatus: 'synced',
      },
      vi.fn(),
    );

    expect(options.message).toContain('sincronizada con un calendario externo');
    expect(options.message).toContain('también se eliminará');
  });
});
