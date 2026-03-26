import { ClientStage } from '../../enums/client-stage.enum';

export interface IUpdateTemplatePayload {
  messageBody?: string;
  stage?: ClientStage;
}
