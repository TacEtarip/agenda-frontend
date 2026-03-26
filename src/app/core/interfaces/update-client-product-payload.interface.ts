import { ClientProductStatus } from '../../enums/client-product-status.enum';

export interface IUpdateClientProductPayload {
  status?: ClientProductStatus;
  notes?: string;
}
