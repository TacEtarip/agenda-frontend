import { Injectable, signal } from '@angular/core';
import { ClientStage } from '../../enums/client-stage.enum';
import { IMessageTemplate } from '../../interfaces/message-template.interface';

interface IUpsertMessageTemplateInput {
  templateId?: string;
  stage: ClientStage;
  messageBody: string;
}

@Injectable({ providedIn: 'root' })
export class MessageTemplateStore {
  private readonly templatesState = signal<IMessageTemplate[]>([
    {
      id: 'mt-1',
      stage: ClientStage.FIRST_CONTACT,
      messageBody:
        'Hola {{name}}. ¡Gracias por contactarme! Me gustaría agendar una consulta inicial para conocer mejor tus necesidades. ¿Cuándo te viene bien?',
      updatedAt: '2026-02-10T09:00:00.000Z',
    },
    {
      id: 'mt-2',
      stage: ClientStage.FOLLOW_UP,
      messageBody:
        'Hola {{name}}. Te escribo para dar seguimiento a la propuesta que te envié. ¿Tienes alguna duda que pueda aclarar? Puedo ajustarla según tus comentarios.',
      updatedAt: '2026-02-15T16:30:00.000Z',
    },
    {
      id: 'mt-3',
      stage: ClientStage.FOLLOW_UP,
      messageBody:
        'Hola {{name}}. Paso por aquí para saber si quieres que te comparta una versión más resumida de la propuesta o una alternativa ajustada a tu presupuesto.',
      updatedAt: '2026-02-18T11:10:00.000Z',
    },
    {
      id: 'mt-4',
      stage: ClientStage.MAINTENANCE,
      messageBody:
        'Hola {{name}}. Espero que todo vaya muy bien. Solo quería confirmar que estás satisfecho con el servicio. Avísame si puedo ayudarte en algo.',
      updatedAt: '2026-01-05T12:15:00.000Z',
    },
    {
      id: 'mt-5',
      stage: ClientStage.CLOSED_SALE,
      messageBody:
        'Hola {{name}}. ¡Felicidades por tu decisión! Estoy muy contento de trabajar contigo. En breve te envío los detalles de inicio.',
      updatedAt: '2026-01-20T10:20:00.000Z',
    },
  ]);

  readonly templates = this.templatesState.asReadonly();

  saveTemplate(input: IUpsertMessageTemplateInput) {
    const messageBody = input.messageBody.trim();
    if (!messageBody) return;

    const now = new Date().toISOString();

    if (input.templateId) {
      this.templatesState.update((templates) =>
        templates.map((template) =>
          template.id === input.templateId
            ? { ...template, stage: input.stage, messageBody, updatedAt: now }
            : template,
        ),
      );
      return;
    }

    const newTemplate: IMessageTemplate = {
      id: `mt-${Date.now()}`,
      stage: input.stage,
      messageBody,
      updatedAt: now,
    };

    this.templatesState.update((templates) => [newTemplate, ...templates]);
  }

  deleteTemplate(templateId: string) {
    this.templatesState.update((templates) =>
      templates.filter((template) => template.id !== templateId),
    );
  }
}
