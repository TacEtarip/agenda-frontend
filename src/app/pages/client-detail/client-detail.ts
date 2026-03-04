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
    { value: ClientStage.FIRST_CONTACT, label: 'First Contact', color: 'primary' },
    { value: ClientStage.FOLLOW_UP,     label: 'Follow-Up',     color: 'warning' },
    { value: ClientStage.CLOSED_SALE,   label: 'Closed Sale',   color: 'success' },
    { value: ClientStage.MAINTENANCE,   label: 'Maintenance',   color: 'tertiary' },
    { value: ClientStage.POST_SALE,     label: 'Post Sale',     color: 'medium' },
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
    createdAt: 'Jan 15, 2026',
    stage: ClientStage.FOLLOW_UP,
  });

  readonly notes = signal<INote[]>([
    {
      id: '1',
      content: 'Client prefers morning appointments. Very interested in the premium plan. Has two dogs — mention pet policy.',
      createdAt: 'Feb 28, 2026',
      updatedAt: 'Feb 28, 2026',
    },
    {
      id: '2',
      content: 'Follow-up needed regarding the proposal sent on 02/20. She mentioned budget concerns — prepare alternative options.',
      createdAt: 'Feb 20, 2026',
      updatedAt: 'Feb 25, 2026',
    },
  ]);

  readonly appointments = signal<IClientAppointment[]>([
    {
      id: '1',
      title: 'Initial Consultation',
      description: 'First meeting to assess requirements and expectations.',
      startTime: 'Mar 5, 2026 · 10:00 AM',
      endTime: '11:00 AM',
      status: 'scheduled',
    },
    {
      id: '2',
      title: 'Follow-up Session',
      description: 'Review the proposal and address budget concerns.',
      startTime: 'Feb 20, 2026 · 3:00 PM',
      endTime: '4:00 PM',
      status: 'completed',
    },
  ]);

  readonly attachments = signal<IAttachment[]>([
    { id: '1', fileName: 'proposal_v2.pdf', fileType: 'PDF', fileSize: '1.2 MB', uploadedAt: 'Feb 20, 2026', icon: 'document-outline' },
    { id: '2', fileName: 'client_photo.jpg', fileType: 'Image', fileSize: '840 KB', uploadedAt: 'Jan 15, 2026', icon: 'image-outline' },
  ]);

  // Mock message templates — will be replaced by API call
  readonly messageTemplates = signal<IMessageTemplate[]>([
    {
      id: '1',
      stage: ClientStage.FIRST_CONTACT,
      messageBody: 'Hi {{name}}! Thanks for reaching out. I\'d love to schedule an initial consultation to learn more about your needs. When are you available?',
      updatedAt: 'Feb 10, 2026',
    },
    {
      id: '2',
      stage: ClientStage.FOLLOW_UP,
      messageBody: 'Hi {{name}}! Just checking in on the proposal I sent over. Do you have any questions I can help clarify? I\'m happy to adjust based on your feedback.',
      updatedAt: 'Feb 15, 2026',
    },
    {
      id: '3',
      stage: ClientStage.CLOSED_SALE,
      messageBody: 'Hi {{name}}! Congratulations on your decision! 🎉 I\'m excited to work with you. I\'ll send over the onboarding details shortly.',
      updatedAt: 'Jan 20, 2026',
    },
    {
      id: '4',
      stage: ClientStage.MAINTENANCE,
      messageBody: 'Hi {{name}}! Hope everything is going well. Just checking in to make sure you\'re satisfied with the service. Let me know if there\'s anything I can help with!',
      updatedAt: 'Jan 5, 2026',
    },
    {
      id: '5',
      stage: ClientStage.POST_SALE,
      messageBody: 'Hi {{name}}! It\'s been a pleasure working with you. I wanted to follow up and see if you\'d be interested in any of our other services. Also, a referral is always appreciated! 😊',
      updatedAt: 'Jan 1, 2026',
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
      header: `Edit Template — ${this.stageLabel(stage)}`,
      inputs: [
        {
          name: 'messageBody',
          type: 'textarea',
          placeholder: 'Write your template here. Use {{name}} for the client\'s name.',
          value: template?.messageBody ?? '',
          attributes: { rows: 6 },
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (data: { messageBody: string }) => {
            if (!data.messageBody.trim()) return;
            const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
      header: 'Delete Template',
      message: 'Are you sure you want to delete this message template?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
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
