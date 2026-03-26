import { ICreateProductPayload } from './create-product-payload.interface';

export interface IUpdateProductPayload extends Partial<ICreateProductPayload> {}
