import { ClientStage } from '../../enums/client-stage.enum';

export interface IClientApiResponse {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  stage: ClientStage;
  createdAt: string;
}
