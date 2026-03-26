import { ClientProductStatus } from '../../enums/client-product-status.enum';

export interface ICreateClientProductPayload {
  clientId: string;
  productId: string;
  status: ClientProductStatus;
  notes?: string;
}
