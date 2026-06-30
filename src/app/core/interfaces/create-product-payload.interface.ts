import { ProductType } from '../../enums/product-type.enum';

export interface ICreateProductPayload {
  name: string;
  description?: string;
  price?: number;
  type?: ProductType;
}
