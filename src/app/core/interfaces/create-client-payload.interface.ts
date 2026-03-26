import { ClientStage } from '../../enums/client-stage.enum';

export interface ICreateClientPayload {
  userId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber: string;
  stage: ClientStage;
}
