import { PaymentSourceType } from '../../../enums/payment-source-type.enum';

export interface IPaymentModalTarget {
  sourceType: PaymentSourceType;
  sourceId: string;
  concept: string;
  amount?: number;
}
