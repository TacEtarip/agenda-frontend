import { ProductType } from '../enums/product-type.enum';

export interface IProduct {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  description?: string;
  price?: number;
  type: ProductType;
}
