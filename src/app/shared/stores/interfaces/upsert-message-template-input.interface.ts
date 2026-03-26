import { ClientStage } from '../../../enums/client-stage.enum';

export interface IUpsertMessageTemplateInput {
  templateId?: string;
  stage: ClientStage;
  messageBody: string;
}
