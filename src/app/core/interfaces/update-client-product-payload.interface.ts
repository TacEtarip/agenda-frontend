import { ClientProductStatus } from '../../enums/client-product-status.enum';

export interface IUpdateClientProductPayload {
  status?: ClientProductStatus;
  customPrice?: number | null;
  quantity?: number | null;
  notes?: string;
}
