import { IClientProduct } from '../../../interfaces/client-product.interface';
import { ProductType } from '../../../enums/product-type.enum';

export interface IEnrichedClientProduct extends IClientProduct {
  resolvedProductName: string;
  resolvedProductPrice: number | undefined;
  resolvedProductQuantity: number | undefined;
  resolvedProductTotalPrice: number | undefined;
  catalogProductPrice: number | undefined;
  resolvedProductType: ProductType;
}
