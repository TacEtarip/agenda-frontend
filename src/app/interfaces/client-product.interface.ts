import { ClientProductStatus } from '../enums/client-product-status.enum';

export interface IClientProduct {
  id: string;
  clientId: string;
  productId: string;
  status: ClientProductStatus;
  offeredAt: string;
  updatedAt: string;
  notes?: string;
}
