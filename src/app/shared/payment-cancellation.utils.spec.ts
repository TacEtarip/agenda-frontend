import { describe, expect, it, vi } from 'vitest';
import { buildPaymentCancellationAlert } from './payment-cancellation.utils';

describe('buildPaymentCancellationAlert', () => {
  it('does not cancel until the destructive action is confirmed', () => {
    const onConfirm = vi.fn();
    const options = buildPaymentCancellationAlert('Andrea Pérez', 120, onConfirm);

    expect(options.message).toContain('S/ 120.00');
    expect(options.subHeader).toBe('Andrea Pérez');
    expect(onConfirm).not.toHaveBeenCalled();

    options.buttons.find((button) => button.role === 'cancel')?.handler?.();
    expect(onConfirm).not.toHaveBeenCalled();

    options.buttons.find((button) => button.role === 'destructive')?.handler?.();
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
