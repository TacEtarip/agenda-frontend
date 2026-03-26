import { IClientProduct } from '../../../interfaces/client-product.interface';

export interface IEnrichedClientProduct extends IClientProduct {
  resolvedProductName: string;
  resolvedProductPrice: number | undefined;
}
