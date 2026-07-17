import { Pipe, PipeTransform } from '@angular/core';
import { AppointmentStatus } from '../../types/appointment-status.type';

@Pipe({ name: 'appointmentStatusLabel', pure: true, standalone: true })
export class AppointmentStatusLabelPipe implements PipeTransform {
  transform(status: AppointmentStatus): string {
    if (status === 'scheduled') return 'Programada';
    if (status === 'expired') return 'Vencida';
    if (status === 'completed') return 'Completada';
    return 'Cancelada';
  }
}

@Pipe({ name: 'appointmentStatusColor', pure: true, standalone: true })
export class AppointmentStatusColorPipe implements PipeTransform {
  transform(status: AppointmentStatus): string {
    if (status === 'scheduled') return 'primary';
    if (status === 'expired') return 'warning';
    if (status === 'completed') return 'success';
    return 'danger';
  }
}
