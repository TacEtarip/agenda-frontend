import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentOrigin } from '../enums/payment-origin.enum';
import { PaymentSourceType } from '../enums/payment-source-type.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

export interface IPayment {
  id: string;
  companyId: string;
  clientId: string;
  appointmentId?: string;
  clientProductId?: string;
  amount: number;
  currency: string;
  description: string;
  status: PaymentStatus;
  origin: PaymentOrigin;
  method: PaymentMethod;
  providerPaymentId?: string;
  checkoutUrl?: string;
  reference?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  sourceType: PaymentSourceType;
  sourceId: string;
}
