import { Injectable, inject, signal } from '@angular/core';
import { IMessageTemplate } from '../../interfaces/message-template.interface';
import { MessageTemplateApiService } from '../../core/services/message-template-api.service';
import { IUpsertMessageTemplateInput } from './interfaces/upsert-message-template-input.interface';

@Injectable({ providedIn: 'root' })
export class MessageTemplateStore {
  private readonly templateApi = inject(MessageTemplateApiService);
  private loadRequestId = 0;
  private readonly templatesState = signal<IMessageTemplate[]>([]);
  private readonly templatesLoadingState = signal(false);
  private readonly templatesErrorState = signal<string | null>(null);

  readonly templates = this.templatesState.asReadonly();
  readonly templatesLoading = this.templatesLoadingState.asReadonly();
  readonly templatesError = this.templatesErrorState.asReadonly();

  load(): void {
    const requestId = ++this.loadRequestId;
    this.templatesLoadingState.set(true);
    this.templatesErrorState.set(null);
    this.templateApi.getAll().subscribe({
      next: (templates) => {
        if (requestId !== this.loadRequestId) return;
        this.templatesState.set(templates);
        this.templatesLoadingState.set(false);
      },
      error: () => {
        if (requestId !== this.loadRequestId) return;
        this.templatesErrorState.set('No se pudieron cargar las plantillas.');
        this.templatesLoadingState.set(false);
      },
    });
  }

  saveTemplate(input: IUpsertMessageTemplateInput): void {
    const messageBody = input.messageBody.trim();
    if (!messageBody) return;

    this.templatesErrorState.set(null);

    if (input.templateId) {
      this.templateApi.update(input.templateId, { stage: input.stage, messageBody }).subscribe({
        next: (updated) => {
          this.templatesState.update((templates) =>
            templates.map((t) => (t.id === input.templateId ? updated : t)),
          );
        },
        error: () => {
          this.templatesErrorState.set('No se pudo actualizar la plantilla.');
        },
      });
    } else {
      this.templateApi.create({ stage: input.stage, messageBody }).subscribe({
        next: (created) => {
          this.templatesState.update((templates) => [created, ...templates]);
        },
        error: () => {
          this.templatesErrorState.set('No se pudo crear la plantilla.');
        },
      });
    }
  }

  deleteTemplate(templateId: string): void {
    this.templatesErrorState.set(null);
    this.templateApi.remove(templateId).subscribe({
      next: () => {
        this.templatesState.update((templates) => templates.filter((t) => t.id !== templateId));
      },
      error: () => {
        this.templatesErrorState.set('No se pudo eliminar la plantilla.');
      },
    });
  }
}
