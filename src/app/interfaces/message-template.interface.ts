import { ClientStage } from '../enums/client-stage.enum';

export interface IMessageTemplate {
  id: string;
  stage: ClientStage;
  messageBody: string;
  updatedAt: string;
}
