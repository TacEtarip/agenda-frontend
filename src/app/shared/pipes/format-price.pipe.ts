import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'formatPrice', pure: true, standalone: true })
export class FormatPricePipe implements PipeTransform {
  private readonly formatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  });

  transform(price: number | null | undefined): string {
    if (price == null) return 'Sin precio';
    return this.formatter.format(price);
  }
}
