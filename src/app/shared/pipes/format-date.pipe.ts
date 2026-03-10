import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'formatDate', pure: true, standalone: true })
export class FormatDatePipe implements PipeTransform {
  transform(dateIso: string): string {
    return new Date(dateIso).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}
