import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'formatDate', pure: true, standalone: true })
export class FormatDatePipe implements PipeTransform {
  transform(dateIso: string): string {
    const date = new Date(dateIso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}
