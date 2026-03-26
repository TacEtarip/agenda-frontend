import { ICreateClientPayload } from './create-client-payload.interface';

export interface IUpdateClientPayload extends Partial<ICreateClientPayload> {}
