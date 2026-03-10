import { ClientStage } from '../enums/client-stage.enum';
import { IClientStageOption } from '../interfaces/client-stage-option.interface';

export const CLIENT_STAGE_OPTIONS: readonly IClientStageOption[] = [
  { value: ClientStage.FIRST_CONTACT, label: 'Primer contacto', color: 'primary' },
  { value: ClientStage.FOLLOW_UP,     label: 'Seguimiento',     color: 'warning' },
  { value: ClientStage.CLOSED_SALE,   label: 'Venta cerrada',   color: 'success' },
  { value: ClientStage.MAINTENANCE,   label: 'Mantenimiento',   color: 'tertiary' },
  { value: ClientStage.POST_SALE,     label: 'Postventa',       color: 'medium' },
] as const;

export function getStageLabel(stage: ClientStage): string {
  return CLIENT_STAGE_OPTIONS.find((s) => s.value === stage)?.label ?? stage;
}

export function getStageColor(stage: ClientStage): string {
  return CLIENT_STAGE_OPTIONS.find((s) => s.value === stage)?.color ?? 'medium';
}
