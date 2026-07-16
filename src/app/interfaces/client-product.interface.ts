import { ClientProductStatus } from '../enums/client-product-status.enum';

export interface IClientProduct {
  id: string;
  clientId: string;
  productId: string;
  status: ClientProductStatus;
  offeredAt: string;
  updatedAt: string;
  customPrice?: number | null;
  quantity?: number | null;
  notes?: string;
}
