import { PaymentMethod } from '../enums/payment-method.enum';
import { ICreatePaymentLinkPayload } from './create-payment-link-payload.interface';

export interface IRegisterManualPaymentPayload extends ICreatePaymentLinkPayload {
  method: Exclude<PaymentMethod, PaymentMethod.ONLINE>;
  paidAt: string;
  reference?: string;
}
