import { Injectable, inject, signal } from '@angular/core';
import { IMessageTemplate } from '../../interfaces/message-template.interface';
import { MessageTemplateApiService } from '../../core/services/message-template-api.service';
import { IUpsertMessageTemplateInput } from './interfaces/upsert-message-template-input.interface';
import { Observable, catchError, finalize, tap, throwError } from 'rxjs';
import { TenantSessionStateService } from '../../core/services/tenant-session-state.service';

@Injectable({ providedIn: 'root' })
export class MessageTemplateStore {
  private readonly templateApi = inject(MessageTemplateApiService);
  private readonly tenantSessionState = inject(TenantSessionStateService);
  private loadRequestId = 0;
  private readonly templatesState = signal<IMessageTemplate[]>([]);
  private readonly templatesLoadingState = signal(false);
  private readonly templatesErrorState = signal<string | null>(null);
  private readonly templatesMutatingState = signal(false);

  readonly templates = this.templatesState.asReadonly();
  readonly templatesLoading = this.templatesLoadingState.asReadonly();
  readonly templatesError = this.templatesErrorState.asReadonly();
  readonly templatesMutating = this.templatesMutatingState.asReadonly();

  constructor() {
    this.tenantSessionState.registerReset(() => this.reset());
  }

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

  saveTemplate(input: IUpsertMessageTemplateInput): Observable<IMessageTemplate> {
    const generation = this.tenantSessionState.generation;
    const messageBody = input.messageBody.trim();
    if (!messageBody) return throwError(() => new Error('El mensaje es obligatorio.'));

    this.templatesErrorState.set(null);
    this.templatesMutatingState.set(true);

    const request = input.templateId
      ? this.templateApi.update(input.templateId, { stage: input.stage, messageBody })
      : this.templateApi.create({ stage: input.stage, messageBody });

    return request.pipe(
      tap((saved) => {
        if (!this.tenantSessionState.isCurrent(generation)) return;
        this.templatesState.update((templates) =>
          input.templateId
            ? templates.map((template) => (template.id === input.templateId ? saved : template))
            : [saved, ...templates],
        );
      }),
      catchError((error: unknown) => {
        this.templatesErrorState.set(
          input.templateId
            ? 'No se pudo actualizar la plantilla.'
            : 'No se pudo crear la plantilla.',
        );
        return throwError(() => error);
      }),
      finalize(() => this.templatesMutatingState.set(false)),
    );
  }

  deleteTemplate(templateId: string): Observable<void> {
    const generation = this.tenantSessionState.generation;
    this.templatesErrorState.set(null);
    this.templatesMutatingState.set(true);
    return this.templateApi.remove(templateId).pipe(
      tap(() => {
        if (!this.tenantSessionState.isCurrent(generation)) return;
        this.templatesState.update((templates) =>
          templates.filter((template) => template.id !== templateId),
        );
      }),
      catchError((error: unknown) => {
        this.templatesErrorState.set('No se pudo eliminar la plantilla.');
        return throwError(() => error);
      }),
      finalize(() => this.templatesMutatingState.set(false)),
    );
  }

  reset(): void {
    this.loadRequestId += 1;
    this.templatesState.set([]);
    this.templatesLoadingState.set(false);
    this.templatesMutatingState.set(false);
    this.templatesErrorState.set(null);
  }
}
