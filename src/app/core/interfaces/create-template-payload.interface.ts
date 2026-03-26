import { ClientStage } from '../../enums/client-stage.enum';

export interface ICreateTemplatePayload {
  userId: string;
  stage: ClientStage;
  messageBody: string;
}
