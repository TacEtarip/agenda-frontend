import { PaymentOrigin } from '../enums/payment-origin.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { IPayment } from '../interfaces/payment.interface';

export interface YapePaymentConfirmationAlertOptions {
  header: string;
  subHeader: string;
  message: string;
  buttons: Array<{
    text: string;
    role: 'cancel' | 'confirm';
    handler?: () => void;
  }>;
}

export function isConfirmableYapePayment(
  payment: Pick<IPayment, 'origin' | 'status'>,
): boolean {
  return (
    payment.origin === PaymentOrigin.DIRECT_YAPE &&
    payment.status === PaymentStatus.PENDING
  );
}

export function buildYapePaymentConfirmationAlert(
  clientName: string,
  amount: number,
  onConfirm: () => void,
): YapePaymentConfirmationAlertOptions {
  const formattedAmount = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(amount);

  return {
    header: 'Confirmar pago recibido',
    subHeader: clientName,
    message: `Verifica en tu aplicación Yape que recibiste ${formattedAmount}. Al confirmar, el cobro quedará marcado como pagado.`,
    buttons: [
      { text: 'Todavía no', role: 'cancel' },
      { text: 'Sí, lo recibí', role: 'confirm', handler: onConfirm },
    ],
  };
}
