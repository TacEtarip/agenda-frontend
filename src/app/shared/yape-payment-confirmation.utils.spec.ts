import { describe, expect, it, vi } from 'vitest';
import { PaymentOrigin } from '../enums/payment-origin.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import {
  buildYapePaymentConfirmationAlert,
  isConfirmableYapePayment,
} from './yape-payment-confirmation.utils';

describe('Yape payment confirmation', () => {
  it('only allows pending direct Yape payments', () => {
    expect(
      isConfirmableYapePayment({
        origin: PaymentOrigin.DIRECT_YAPE,
        status: PaymentStatus.PENDING,
      }),
    ).toBe(true);
    expect(
      isConfirmableYapePayment({
        origin: PaymentOrigin.MANUAL,
        status: PaymentStatus.PENDING,
      }),
    ).toBe(false);
    expect(
      isConfirmableYapePayment({
        origin: PaymentOrigin.DIRECT_YAPE,
        status: PaymentStatus.PAID,
      }),
    ).toBe(false);
  });

  it('does not confirm until the user accepts the verification alert', () => {
    const onConfirm = vi.fn();
    const options = buildYapePaymentConfirmationAlert('Andrea Pérez', 120, onConfirm);

    expect(options.message).toContain('S/ 120.00');
    expect(options.subHeader).toBe('Andrea Pérez');
    expect(onConfirm).not.toHaveBeenCalled();

    options.buttons.find((button) => button.role === 'cancel')?.handler?.();
    expect(onConfirm).not.toHaveBeenCalled();

    options.buttons.find((button) => button.role === 'confirm')?.handler?.();
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
