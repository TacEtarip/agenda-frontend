export interface PaymentCancellationAlertOptions {
  header: string;
  subHeader: string;
  message: string;
  buttons: Array<{
    text: string;
    role: 'cancel' | 'destructive';
    handler?: () => void;
  }>;
}

export function buildPaymentCancellationAlert(
  clientName: string,
  amount: number,
  onConfirm: () => void,
): PaymentCancellationAlertOptions {
  const formattedAmount = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(amount);

  return {
    header: 'Cancelar cobro',
    subHeader: clientName,
    message: `Se cancelará el cobro de ${formattedAmount}. Esta acción no se puede deshacer.`,
    buttons: [
      { text: 'Volver', role: 'cancel' },
      { text: 'Cancelar cobro', role: 'destructive', handler: onConfirm },
    ],
  };
}
