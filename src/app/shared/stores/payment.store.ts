import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { PaymentApiService } from '../../core/services/payment-api.service';
import { IPaymentListFilters } from '../../core/interfaces/payment-list-filters.interface';
import { PaymentSourceType } from '../../enums/payment-source-type.enum';
import { IPayment } from '../../interfaces/payment.interface';
import { ICreatePaymentLinkPayload } from '../../interfaces/create-payment-link-payload.interface';
import { IRegisterManualPaymentPayload } from '../../interfaces/register-manual-payment-payload.interface';

@Injectable({ providedIn: 'root' })
export class PaymentStore {
  private readonly api = inject(PaymentApiService);
  private readonly _payments = signal<IPayment[]>([]);
  private readonly _total = signal(0);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly payments = this._payments.asReadonly();
  readonly total = this._total.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  load(filters: IPaymentListFilters = {}): void {
    this._loading.set(true);
    this._error.set(null);
    this.api.list(filters).subscribe({
      next: (result) => {
        this._payments.set(result.items);
        this._total.set(result.total);
        this._loading.set(false);
      },
      error: () => {
        this._error.set('No se pudieron cargar los pagos.');
        this._loading.set(false);
      },
    });
  }

  history(sourceType: PaymentSourceType, sourceId: string): Observable<IPayment[]> {
    return this.api.history(sourceType, sourceId);
  }

  createLink(payload: ICreatePaymentLinkPayload): Observable<IPayment> {
    return this.api.createLink(payload).pipe(tap((payment) => this.upsert(payment)));
  }

  registerManual(payload: IRegisterManualPaymentPayload): Observable<IPayment> {
    return this.api.registerManual(payload).pipe(tap((payment) => this.upsert(payment)));
  }

  cancel(id: string): Observable<IPayment> {
    return this.api.cancel(id).pipe(tap((payment) => this.upsert(payment)));
  }

  private upsert(payment: IPayment): void {
    this._payments.update((payments) => [payment, ...payments.filter((item) => item.id !== payment.id)]);
  }
}
