export interface ICreateProductPayload {
  userId: string;
  name: string;
  description?: string;
  price?: number;
}
