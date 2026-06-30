import { ClientStage } from '../../enums/client-stage.enum';

export interface ICreateClientPayload {
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber: string;
  stage: ClientStage;
}
