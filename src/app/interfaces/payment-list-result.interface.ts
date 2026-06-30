import { IPayment } from './payment.interface';

export interface IPaymentListResult {
  items: IPayment[];
  total: number;
  page: number;
  limit: number;
}
