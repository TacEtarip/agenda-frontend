import { IClientProduct } from '../../../interfaces/client-product.interface';
import { ProductType } from '../../../enums/product-type.enum';

export interface IEnrichedClientProduct extends IClientProduct {
  resolvedProductName: string;
  resolvedProductPrice: number | undefined;
  resolvedProductType: ProductType;
}
