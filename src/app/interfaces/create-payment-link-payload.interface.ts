import { PaymentSourceType } from '../enums/payment-source-type.enum';

export interface ICreatePaymentLinkPayload {
  sourceType: PaymentSourceType;
  sourceId: string;
  amount: number;
  description?: string;
}
