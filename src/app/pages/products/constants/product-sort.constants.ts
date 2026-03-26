import { ProductSort } from '../enums/product-sort.enum';

export const VALID_PRODUCT_SORTS = new Set<ProductSort>([
  ProductSort.RECENT,
  ProductSort.PRICE_DESC,
  ProductSort.PRICE_ASC,
  ProductSort.NAME,
]);
