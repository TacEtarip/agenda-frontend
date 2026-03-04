import { ClientStage } from '../enums/client-stage.enum';

export interface IClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  initials: string;
  color: string;
  stage: ClientStage;
  createdAt?: string;
}
