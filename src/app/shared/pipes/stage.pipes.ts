import { Pipe, PipeTransform } from '@angular/core';
import { ClientStage } from '../../enums/client-stage.enum';
import { getStageColor, getStageLabel } from '../client-stage.utils';

@Pipe({ name: 'stageLabel', pure: true, standalone: true })
export class StageLabelPipe implements PipeTransform {
  transform(stage: ClientStage): string {
    return getStageLabel(stage);
  }
}

@Pipe({ name: 'stageColor', pure: true, standalone: true })
export class StageColorPipe implements PipeTransform {
  transform(stage: ClientStage): string {
    return getStageColor(stage);
  }
}
