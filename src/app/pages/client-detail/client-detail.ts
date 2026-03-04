import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ClientStage } from '../../enums/client-stage.enum';
import { IAttachment } from '../../interfaces/attachment.interface';
import { IClientAppointment } from '../../interfaces/client-appointment.interface';
import { IClient } from '../../interfaces/client.interface';
import { IClientStageOption } from '../../interfaces/client-stage-option.interface';
import { IMessageTemplate } from '../../interfaces/message-template.interface';
import { INote } from '../../interfaces/note.interface';
import { COMMON_ION_PAGE_IMPORTS } from '../../shared/ionic-imports';
import { addIcons } from 'ionicons';
import {
  logoWhatsapp,
  callOutline,
  mailOutline,
  addOutline,
  documentOutline,
  imageOutline,
  cloudDownloadOutline,
  createOutline,
  trashOutline,
  timeOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  arrowBackOutline,
  chatbubblesOutline,
  sendOutline,
  swapHorizontalOutline,
  sparklesOutline,
  copyOutline,
} from 'ionicons/icons';
import {
  AlertController,
  IonBackButton,
  IonCardHeader,
  IonCardTitle,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';

type Segment = 'notes' | 'appointments' | 'attachments' | 'messages';

@Component({
  selector: 'app-client-detail',
  imports: [
    ...COMMON_ION_PAGE_IMPORTS,
    IonBackButton,
    IonCardHeader,
    IonCardTitle,
    IonSegment,
    IonSegmentButton,
    IonNote,
    IonSelect,
    IonSelectOption,
  ],
  templateUrl: './client-detail.html',
  styleUrl: './client-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly alertCtrl = inject(AlertController);
  readonly clientId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly allStages: IClientStageOption[] = [
    { value: ClientStage.FIRST_CONTACT, label: 'Primer contacto', color: 'primary' },
    { value: ClientStage.FOLLOW_UP,     label: 'Seguimiento',     color: 'warning' },
    { value: ClientStage.CLOSED_SALE,   label: 'Venta cerrada',   color: 'success' },
    { value: ClientStage.MAINTENANCE,   label: 'Mantenimiento',   color: 'tertiary' },
    { value: ClientStage.POST_SALE,     label: 'Postventa',       color: 'medium' },
  ];

  readonly activeSegment = signal<Segment>('notes');

  // Mock client data — will be replaced by API call
  readonly client = signal<IClient>({
    id: this.clientId,
    firstName: 'María',
    lastName: 'García',
    email: 'maria.garcia@example.com',
    phone: '+34612345678',
    initials: 'MG',
    color: 'avatar--blue',
    createdAt: '15 ene 2026',
    stage: ClientStage.FOLLOW_UP,
  });

  readonly notes = signal<INote[]>([
    {
      id: '1',
      content: 'La clienta prefiere citas por la mañana. Está muy interesada en el plan premium. Tiene dos perros: mencionar política para mascotas.',
      createdAt: '28 feb 2026',
      updatedAt: '28 feb 2026',
    },
    {
      id: '2',
      content: 'Hacer seguimiento de la propuesta enviada el 20/02. Comentó dudas de presupuesto: preparar opciones alternativas.',
      createdAt: '20 feb 2026',
      updatedAt: '25 feb 2026',
    },
  ]);

  readonly appointments = signal<IClientAppointment[]>([
    {
      id: '1',
      title: 'Consulta inicial',
      description: 'Primera reunión para evaluar requisitos y expectativas.',
      startTime: '5 mar 2026 · 10:00',
      endTime: '11:00',
      status: 'scheduled',
    },
    {
      id: '2',
      title: 'Sesión de seguimiento',
      description: 'Revisar la propuesta y resolver inquietudes de presupuesto.',
      startTime: '20 feb 2026 · 15:00',
      endTime: '16:00',
      status: 'completed',
    },
  ]);

  readonly attachments = signal<IAttachment[]>([
    { id: '1', fileName: 'proposal_v2.pdf', fileType: 'PDF', fileSize: '1.2 MB', uploadedAt: '20 feb 2026', icon: 'document-outline' },
    { id: '2', fileName: 'client_photo.jpg', fileType: 'Imagen', fileSize: '840 KB', uploadedAt: '15 ene 2026', icon: 'image-outline' },
  ]);

  // Mock message templates — will be replaced by API call
  readonly messageTemplates = signal<IMessageTemplate[]>([
    {
      id: '1',
      stage: ClientStage.FIRST_CONTACT,
      messageBody: 'Hola {{name}}. ¡Gracias por contactarme! Me gustaría agendar una consulta inicial para conocer mejor tus necesidades. ¿Cuándo te viene bien?',
      updatedAt: '10 feb 2026',
    },
    {
      id: '2',
      stage: ClientStage.FOLLOW_UP,
      messageBody: 'Hola {{name}}. Te escribo para dar seguimiento a la propuesta que te envié. ¿Tienes alguna duda que pueda aclarar? Puedo ajustarla según tus comentarios.',
      updatedAt: '15 feb 2026',
    },
    {
      id: '3',
      stage: ClientStage.CLOSED_SALE,
      messageBody: 'Hola {{name}}. ¡Felicidades por tu decisión! Estoy muy contento de trabajar contigo. En breve te envío los detalles de inicio.',
      updatedAt: '20 ene 2026',
    },
    {
      id: '4',
      stage: ClientStage.MAINTENANCE,
      messageBody: 'Hola {{name}}. Espero que todo vaya muy bien. Solo quería confirmar que estás satisfecho con el servicio. Avísame si puedo ayudarte en algo.',
      updatedAt: '5 ene 2026',
    },
    {
      id: '5',
      stage: ClientStage.POST_SALE,
      messageBody: 'Hola {{name}}. Ha sido un placer trabajar contigo. Quería hacer seguimiento para saber si te interesan otros de nuestros servicios. ¡Y una recomendación siempre se agradece!',
      updatedAt: '1 ene 2026',
    },
  ]);

  /** The template that matches the client's current stage */
  readonly currentTemplate = computed(() => {
    const stage = this.client().stage;
    return this.messageTemplates().find((t) => t.stage === stage) ?? null;
  });

  constructor() {
    addIcons({
      logoWhatsapp,
      callOutline,
      mailOutline,
      addOutline,
      documentOutline,
      imageOutline,
      cloudDownloadOutline,
      createOutline,
      trashOutline,
      timeOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      arrowBackOutline,
      chatbubblesOutline,
      sendOutline,
      swapHorizontalOutline,
      sparklesOutline,
      copyOutline,
    });
  }

  onSegmentChange(event: CustomEvent) {
    this.activeSegment.set(event.detail.value as Segment);
  }

  statusColor(status: IClientAppointment['status']): string {
    if (status === 'scheduled') return 'primary';
    if (status === 'completed') return 'success';
    return 'danger';
  }

  appointmentStatusLabel(status: IClientAppointment['status']): string {
    if (status === 'scheduled') return 'Programada';
    if (status === 'completed') return 'Completada';
    return 'Cancelada';
  }

  stageLabel(stage: ClientStage): string {
    return this.allStages.find((s) => s.value === stage)?.label ?? stage;
  }

  stageColor(stage: ClientStage): string {
    return this.allStages.find((s) => s.value === stage)?.color ?? 'medium';
  }

  onStageChange(event: CustomEvent) {
    const newStage = event.detail.value as ClientStage;
    this.client.update((c) => ({ ...c, stage: newStage }));
  }

  generateWhatsAppLink(template: IMessageTemplate): string {
    const phone = this.client().phone.replaceAll(/\D/g, '');
    const message = template.messageBody.replace('{{name}}', this.client().firstName);
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  async openEditTemplateAlert(template: IMessageTemplate | null) {
    const stage = this.client().stage;
    const alert = await this.alertCtrl.create({
      header: `Editar plantilla — ${this.stageLabel(stage)}`,
      inputs: [
        {
          name: 'messageBody',
          type: 'textarea',
          placeholder: 'Escribe tu plantilla aquí. Usa {{name}} para el nombre del cliente.',
          value: template?.messageBody ?? '',
          attributes: { rows: 6 },
        },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (data: { messageBody: string }) => {
            if (!data.messageBody.trim()) return;
            const today = new Date().toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' });
            if (template) {
              this.messageTemplates.update((templates) =>
                templates.map((t) => t.id === template.id ? { ...t, messageBody: data.messageBody, updatedAt: today } : t),
              );
            } else {
              const newTemplate: IMessageTemplate = {
                id: String(Date.now()),
                stage,
                messageBody: data.messageBody,
                updatedAt: today,
              };
              this.messageTemplates.update((templates) => [...templates, newTemplate]);
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async deleteTemplate(template: IMessageTemplate) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar plantilla',
      message: '¿Seguro que quieres eliminar esta plantilla de mensaje?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.messageTemplates.update((templates) => templates.filter((t) => t.id !== template.id));
          },
        },
      ],
    });
    await alert.present();
  }
}
