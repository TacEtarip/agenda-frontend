import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { PaymentApiService } from '../../core/services/payment-api.service';
import { TenantSessionStateService } from '../../core/services/tenant-session-state.service';
import { PaymentMethod } from '../../enums/payment-method.enum';
import { PaymentOrigin } from '../../enums/payment-origin.enum';
import { PaymentSourceType } from '../../enums/payment-source-type.enum';
import { PaymentStatus } from '../../enums/payment-status.enum';
import { IPaymentListResult } from '../../interfaces/payment-list-result.interface';
import { IPayment } from '../../interfaces/payment.interface';
import { PaymentStore } from './payment.store';

describe('PaymentStore tenant session isolation', () => {
  const payment = (companyId: string): IPayment => ({
    id: `payment-${companyId}`,
    companyId,
    clientId: `client-${companyId}`,
    appointmentId: `appointment-${companyId}`,
    amount: 50,
    currency: 'PEN',
    description: 'Consulta',
    status: PaymentStatus.PENDING,
    origin: PaymentOrigin.PAYMENT_LINK,
    method: PaymentMethod.ONLINE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sourceType: PaymentSourceType.APPOINTMENT,
    sourceId: `appointment-${companyId}`,
  });

  it('clears tenant A and ignores its late response before loading tenant B', () => {
    const tenantAResponse = new Subject<IPaymentListResult>();
    const tenantBResponse = new Subject<IPaymentListResult>();
    const api = {
      list: vi.fn().mockReturnValueOnce(tenantAResponse).mockReturnValueOnce(tenantBResponse),
    } as unknown as PaymentApiService;

    TestBed.configureTestingModule({
      providers: [{ provide: PaymentApiService, useValue: api }],
    });
    const store = TestBed.inject(PaymentStore);
    const session = TestBed.inject(TenantSessionStateService);

    store.load();
    session.invalidate();
    tenantAResponse.next({ items: [payment('company-a')], total: 1, page: 1, limit: 20 });
    expect(store.payments()).toEqual([]);

    store.load();
    tenantBResponse.next({ items: [payment('company-b')], total: 1, page: 1, limit: 20 });
    expect(store.payments().map((item) => item.companyId)).toEqual(['company-b']);
  });

  it('replaces a pending Yape payment with its confirmed version', () => {
    const pendingPayment: IPayment = {
      ...payment('company-a'),
      origin: PaymentOrigin.DIRECT_YAPE,
      method: PaymentMethod.YAPE,
    };
    const confirmedPayment: IPayment = {
      ...pendingPayment,
      status: PaymentStatus.PAID,
      paidAt: new Date().toISOString(),
    };
    const api = {
      list: vi.fn().mockReturnValue(
        of({ items: [pendingPayment], total: 1, page: 1, limit: 20 }),
      ),
      confirmYape: vi.fn().mockReturnValue(of(confirmedPayment)),
    } as unknown as PaymentApiService;

    TestBed.configureTestingModule({
      providers: [{ provide: PaymentApiService, useValue: api }],
    });
    const store = TestBed.inject(PaymentStore);
    store.load();

    store.confirmYape(pendingPayment.id).subscribe();

    expect(api.confirmYape).toHaveBeenCalledWith(pendingPayment.id, undefined);
    expect(store.payments()).toEqual([confirmedPayment]);
  });
});
