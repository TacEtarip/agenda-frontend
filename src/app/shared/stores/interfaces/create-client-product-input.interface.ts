import { ClientProductStatus } from '../../../enums/client-product-status.enum';

export interface ICreateClientProductInput {
  clientId: string;
  productId: string;
  status: ClientProductStatus;
  customPrice?: number;
  quantity?: number;
  notes?: string;
}
