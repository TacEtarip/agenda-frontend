import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { PaymentApiService } from '../../core/services/payment-api.service';
import { IPaymentListFilters } from '../../core/interfaces/payment-list-filters.interface';
import { PaymentSourceType } from '../../enums/payment-source-type.enum';
import { IPayment } from '../../interfaces/payment.interface';
import { ICreatePaymentLinkPayload } from '../../interfaces/create-payment-link-payload.interface';
import { IRegisterManualPaymentPayload } from '../../interfaces/register-manual-payment-payload.interface';
import { IYapeConfiguration } from '../../interfaces/yape-configuration.interface';
import { TenantSessionStateService } from '../../core/services/tenant-session-state.service';

@Injectable({ providedIn: 'root' })
export class PaymentStore {
  private readonly api = inject(PaymentApiService);
  private readonly tenantSessionState = inject(TenantSessionStateService);
  private loadRequestId = 0;
  private readonly _payments = signal<IPayment[]>([]);
  private readonly _total = signal(0);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly payments = this._payments.asReadonly();
  readonly total = this._total.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  constructor() {
    this.tenantSessionState.registerReset(() => this.reset());
  }

  load(filters: IPaymentListFilters = {}): void {
    const generation = this.tenantSessionState.generation;
    const requestId = ++this.loadRequestId;
    this._payments.set([]);
    this._total.set(0);
    this._loading.set(true);
    this._error.set(null);
    this.api.list(filters).subscribe({
      next: (result) => {
        if (requestId !== this.loadRequestId || !this.tenantSessionState.isCurrent(generation))
          return;
        this._payments.set(result.items);
        this._total.set(result.total);
        this._loading.set(false);
      },
      error: () => {
        if (requestId !== this.loadRequestId || !this.tenantSessionState.isCurrent(generation))
          return;
        this._error.set('No se pudieron cargar los pagos.');
        this._loading.set(false);
      },
    });
  }

  history(sourceType: PaymentSourceType, sourceId: string): Observable<IPayment[]> {
    return this.api.history(sourceType, sourceId);
  }

  createLink(payload: ICreatePaymentLinkPayload): Observable<IPayment> {
    const generation = this.tenantSessionState.generation;
    return this.api
      .createLink(payload)
      .pipe(tap((payment) => this.upsertIfCurrent(payment, generation)));
  }

  getYapeConfiguration(): Observable<IYapeConfiguration> {
    return this.api.getYapeConfiguration();
  }

  updateYapeConfiguration(configuration: IYapeConfiguration): Observable<IYapeConfiguration> {
    return this.api.updateYapeConfiguration(configuration);
  }

  createYapeRequest(payload: ICreatePaymentLinkPayload): Observable<IPayment> {
    const generation = this.tenantSessionState.generation;
    return this.api
      .createYapeRequest(payload)
      .pipe(tap((payment) => this.upsertIfCurrent(payment, generation)));
  }

  confirmYape(id: string, reference?: string): Observable<IPayment> {
    const generation = this.tenantSessionState.generation;
    return this.api
      .confirmYape(id, reference)
      .pipe(tap((payment) => this.upsertIfCurrent(payment, generation)));
  }

  registerManual(payload: IRegisterManualPaymentPayload): Observable<IPayment> {
    const generation = this.tenantSessionState.generation;
    return this.api
      .registerManual(payload)
      .pipe(tap((payment) => this.upsertIfCurrent(payment, generation)));
  }

  cancel(id: string): Observable<IPayment> {
    const generation = this.tenantSessionState.generation;
    return this.api.cancel(id).pipe(tap((payment) => this.upsertIfCurrent(payment, generation)));
  }

  reset(): void {
    this.loadRequestId += 1;
    this._payments.set([]);
    this._total.set(0);
    this._loading.set(false);
    this._error.set(null);
  }

  private upsertIfCurrent(payment: IPayment, generation: number): void {
    if (this.tenantSessionState.isCurrent(generation)) this.upsert(payment);
  }

  private upsert(payment: IPayment): void {
    this._payments.update((payments) => [
      payment,
      ...payments.filter((item) => item.id !== payment.id),
    ]);
  }
}
