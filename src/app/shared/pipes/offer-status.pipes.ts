import { Pipe, PipeTransform } from '@angular/core';
import { ClientProductStatus } from '../../enums/client-product-status.enum';

@Pipe({ name: 'offerStatusLabel', pure: true, standalone: true })
export class OfferStatusLabelPipe implements PipeTransform {
  transform(status: ClientProductStatus): string {
    if (status === ClientProductStatus.OFFERED) return 'Ofrecido';
    if (status === ClientProductStatus.INTERESTED) return 'Interesado';
    if (status === ClientProductStatus.SOLD) return 'Vendido';
    return 'Rechazado';
  }
}

@Pipe({ name: 'offerStatusColor', pure: true, standalone: true })
export class OfferStatusColorPipe implements PipeTransform {
  transform(status: ClientProductStatus): string {
    if (status === ClientProductStatus.OFFERED) return 'primary';
    if (status === ClientProductStatus.INTERESTED) return 'warning';
    if (status === ClientProductStatus.SOLD) return 'success';
    return 'danger';
  }
}
