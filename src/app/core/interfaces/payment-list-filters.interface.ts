import { PaymentSourceType } from '../../enums/payment-source-type.enum';
import { PaymentStatus } from '../../enums/payment-status.enum';

export interface IPaymentListFilters {
  status?: PaymentStatus;
  clientId?: string;
  sourceType?: PaymentSourceType;
  sourceId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}
