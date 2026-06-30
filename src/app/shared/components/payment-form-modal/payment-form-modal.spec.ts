import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { PaymentMethod } from '../../../enums/payment-method.enum';
import { PaymentOrigin } from '../../../enums/payment-origin.enum';
import { PaymentSourceType } from '../../../enums/payment-source-type.enum';
import { PaymentStatus } from '../../../enums/payment-status.enum';
import { PaymentStore } from '../../stores/payment.store';
import { PaymentFormModal } from './payment-form-modal';

describe('PaymentFormModal', () => {
  it('prefills the product price and generates a link with the selected source', async () => {
    const payment = {
      id: 'payment-1', companyId: 'company-1', clientId: 'client-1',
      clientProductId: 'offer-1', sourceType: PaymentSourceType.CLIENT_PRODUCT,
      sourceId: 'offer-1', amount: 120, currency: 'PEN', description: 'Servicio',
      status: PaymentStatus.PENDING, origin: PaymentOrigin.PAYMENT_LINK,
      method: PaymentMethod.ONLINE, checkoutUrl: 'https://pay.test/1',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    const store = {
      createLink: vi.fn().mockReturnValue(of(payment)),
      registerManual: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [PaymentFormModal],
      providers: [{ provide: PaymentStore, useValue: store }],
    }).compileComponents();
    const fixture = TestBed.createComponent(PaymentFormModal);
    fixture.componentRef.setInput('opened', true);
    fixture.componentRef.setInput('sourceType', PaymentSourceType.CLIENT_PRODUCT);
    fixture.componentRef.setInput('sourceId', 'offer-1');
    fixture.componentRef.setInput('concept', 'Servicio');
    fixture.componentRef.setInput('suggestedAmount', 120);
    fixture.componentRef.setInput('clientName', 'Andrea Pérez');
    await fixture.whenStable();

    fixture.componentInstance.reset();
    fixture.componentInstance.submit();

    expect(fixture.componentInstance.amount()).toBe('120.00');
    expect(store.createLink).toHaveBeenCalledWith(expect.objectContaining({
      sourceType: PaymentSourceType.CLIENT_PRODUCT,
      sourceId: 'offer-1',
      amount: 120,
    }));
  });

  it('rejects an invalid amount without calling the API', async () => {
    const store = { createLink: vi.fn(), registerManual: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [PaymentFormModal],
      providers: [{ provide: PaymentStore, useValue: store }],
    }).compileComponents();
    const fixture = TestBed.createComponent(PaymentFormModal);
    fixture.componentRef.setInput('opened', true);
    fixture.componentRef.setInput('sourceType', PaymentSourceType.APPOINTMENT);
    fixture.componentRef.setInput('sourceId', 'appointment-1');
    fixture.componentRef.setInput('concept', 'Consulta');
    fixture.componentRef.setInput('clientName', 'Andrea Pérez');
    await fixture.whenStable();

    fixture.componentInstance.amount.set('0');
    fixture.componentInstance.submit();

    expect(store.createLink).not.toHaveBeenCalled();
    expect(fixture.componentInstance.error()).toContain('mayor a cero');
  });
});
