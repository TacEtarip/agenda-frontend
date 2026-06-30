import { ClientStage } from '../../enums/client-stage.enum';

export interface ICreateTemplatePayload {
  stage: ClientStage;
  messageBody: string;
}
