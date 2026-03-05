import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ClientStage } from '../../enums/client-stage.enum';
import { ClientProductStatus } from '../../enums/client-product-status.enum';
import { IAttachment } from '../../interfaces/attachment.interface';
import { IClientAppointment } from '../../interfaces/client-appointment.interface';
import { IClientProduct } from '../../interfaces/client-product.interface';
import { IClient } from '../../interfaces/client.interface';
import { IClientStageOption } from '../../interfaces/client-stage-option.interface';
import { IMessageTemplate } from '../../interfaces/message-template.interface';
import { INote } from '../../interfaces/note.interface';
import { COMMON_ION_PAGE_IMPORTS } from '../../shared/ionic-imports';
import { SalesCatalogStore } from '../../shared/stores/sales-catalog.store';
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
  pricetagOutline,
  cashOutline,
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
  IonTextarea,
} from '@ionic/angular/standalone';

type Segment = 'notes' | 'appointments' | 'attachments' | 'products' | 'messages';

interface IAppointmentDraft {
  title: string;
  description: string;
  date: string;
  startHour: string;
  endHour: string;
}

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
    IonTextarea,
  ],
  templateUrl: './client-detail.html',
  styleUrl: './client-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly alertCtrl = inject(AlertController);
  private readonly salesCatalogStore = inject(SalesCatalogStore);
  readonly clientId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly allStages: IClientStageOption[] = [
    { value: ClientStage.FIRST_CONTACT, label: 'Primer contacto', color: 'primary' },
    { value: ClientStage.FOLLOW_UP,     label: 'Seguimiento',     color: 'warning' },
    { value: ClientStage.CLOSED_SALE,   label: 'Venta cerrada',   color: 'success' },
    { value: ClientStage.MAINTENANCE,   label: 'Mantenimiento',   color: 'tertiary' },
    { value: ClientStage.POST_SALE,     label: 'Postventa',       color: 'medium' },
  ];

  readonly activeSegment = signal<Segment>('notes');
  readonly clientProductStatus = ClientProductStatus;
  readonly products = this.salesCatalogStore.products;
  readonly draftProductId = signal('');
  readonly draftProductStatus = signal<ClientProductStatus>(ClientProductStatus.OFFERED);
  readonly draftProductNotes = signal('');
  readonly isAppointmentModalOpen = signal(false);
  readonly editingAppointmentId = signal<string | null>(null);
  readonly appointmentDraft = signal<IAppointmentDraft>(this.createDefaultAppointmentDraft());
  readonly appointmentDraftError = signal<string | null>(null);
  private readonly priceFormatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  });

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
      startAt: '2026-03-05T10:00',
      endAt: '2026-03-05T11:00',
      startTime: '5 mar 2026 · 10:00',
      endTime: '11:00',
      status: 'scheduled',
    },
    {
      id: '2',
      title: 'Sesión de seguimiento',
      description: 'Revisar la propuesta y resolver inquietudes de presupuesto.',
      startAt: '2026-02-20T15:00',
      endAt: '2026-02-20T16:00',
      startTime: '20 feb 2026 · 15:00',
      endTime: '16:00',
      status: 'completed',
    },
  ]);

  readonly attachments = signal<IAttachment[]>([
    { id: '1', fileName: 'proposal_v2.pdf', fileType: 'PDF', fileSize: '1.2 MB', uploadedAt: '20 feb 2026', icon: 'document-outline' },
    { id: '2', fileName: 'client_photo.jpg', fileType: 'Imagen', fileSize: '840 KB', uploadedAt: '15 ene 2026', icon: 'image-outline' },
  ]);

  readonly currentClientProducts = computed(() =>
    this.salesCatalogStore
      .clientProducts()
      .filter((offer) => offer.clientId === this.client().id)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
  );

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
      pricetagOutline,
      cashOutline,
    });
  }

  onSegmentChange(event: CustomEvent) {
    this.activeSegment.set(event.detail.value as Segment);
  }

  openCreateAppointmentModal() {
    this.editingAppointmentId.set(null);
    this.appointmentDraft.set(this.createDefaultAppointmentDraft());
    this.appointmentDraftError.set(null);
    this.isAppointmentModalOpen.set(true);
  }

  openEditAppointmentModal(appointment: IClientAppointment) {
    const fallbackDraft = this.createDefaultAppointmentDraft();
    const startAt = appointment.startAt ?? `${fallbackDraft.date}T${fallbackDraft.startHour}`;
    const endAt = appointment.endAt ?? `${fallbackDraft.date}T${fallbackDraft.endHour}`;

    this.editingAppointmentId.set(appointment.id);
    this.appointmentDraft.set({
      title: appointment.title,
      description: appointment.description ?? '',
      date: startAt.slice(0, 10),
      startHour: startAt.slice(11, 16),
      endHour: endAt.slice(11, 16),
    });
    this.appointmentDraftError.set(null);
    this.isAppointmentModalOpen.set(true);
  }

  closeAppointmentModal() {
    this.isAppointmentModalOpen.set(false);
    this.appointmentDraftError.set(null);
  }

  onAppointmentDraftTextChange(
    field: 'title' | 'description',
    event: Event,
  ) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.appointmentDraft.update((draft) => ({
      ...draft,
      [field]: target.value ?? '',
    }));
  }

  onAppointmentDraftDateChange(
    field: 'date' | 'startHour' | 'endHour',
    event: CustomEvent,
  ) {
    const value = event.detail.value;
    const parsedValue = Array.isArray(value) ? value[0] : value;
    let nextValue = '';

    if (typeof parsedValue === 'string') {
      if (field === 'date') {
        nextValue = this.normalizeDateValue(parsedValue);
      } else {
        nextValue = this.normalizeTimeValue(parsedValue);
      }
    }

    this.appointmentDraft.update((draft) => ({
      ...draft,
      [field]: nextValue,
    }));
  }

  appointmentDraftDateLabel(): string {
    const dateValue = this.appointmentDraft().date;
    if (!dateValue) return 'Seleccionar fecha';
    const date = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(date.getTime())) return 'Seleccionar fecha';
    return this.formatAppointmentDay(date);
  }

  appointmentDraftStartHourLabel(): string {
    return this.appointmentDraft().startHour || '--:--';
  }

  appointmentDraftEndHourLabel(): string {
    return this.appointmentDraft().endHour || '--:--';
  }

  saveAppointmentFromModal() {
    const draft = this.appointmentDraft();
    const title = draft.title.trim();
    if (!title || !draft.date || !draft.startHour || !draft.endHour) {
      this.appointmentDraftError.set('Completa titulo, fecha, hora inicio y hora fin.');
      return;
    }

    const startAt = `${draft.date}T${draft.startHour}`;
    const endAt = `${draft.date}T${draft.endHour}`;

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      this.appointmentDraftError.set('Fecha u hora invalidas.');
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      this.appointmentDraftError.set('La hora de fin debe ser mayor que la de inicio.');
      return;
    }

    const payload: Omit<IClientAppointment, 'id' | 'status'> = {
      title,
      description: draft.description.trim() || undefined,
      startAt,
      endAt,
      startTime: `${this.formatAppointmentDay(startDate)} · ${this.formatAppointmentHour(startDate)}`,
      endTime: this.formatAppointmentHour(endDate),
    };

    const editingId = this.editingAppointmentId();
    if (editingId) {
      this.appointments.update((appointments) =>
        appointments.map((current) =>
          current.id === editingId
            ? { ...current, ...payload }
            : current,
        ),
      );
    } else {
      this.appointments.update((appointments) => [
        {
          id: `appt-${Date.now()}`,
          status: 'scheduled',
          ...payload,
        },
        ...appointments,
      ]);
    }

    this.closeAppointmentModal();
  }

  updateAppointmentStatus(
    appointment: IClientAppointment,
    status: IClientAppointment['status'],
  ) {
    if (appointment.status === status) return;

    this.appointments.update((appointments) =>
      appointments.map((current) =>
        current.id === appointment.id ? { ...current, status } : current,
      ),
    );
  }

  private formatAppointmentDay(dateInput: Date): string {
    return dateInput.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  private formatAppointmentHour(dateInput: Date): string {
    return dateInput.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  private createDefaultAppointmentDraft(): IAppointmentDraft {
    const now = new Date();
    now.setSeconds(0, 0);
    const end = new Date(now.getTime() + 60 * 60 * 1000);

    return {
      title: '',
      description: '',
      date: this.formatDateLocal(now),
      startHour: this.formatHourLocal(now),
      endHour: this.formatHourLocal(end),
    };
  }

  private formatDateLocal(dateInput: Date): string {
    const year = dateInput.getFullYear();
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const day = String(dateInput.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatHourLocal(dateInput: Date): string {
    const hours = String(dateInput.getHours()).padStart(2, '0');
    const minutes = String(dateInput.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private normalizeDateValue(raw: string): string {
    if (raw.length >= 10) return raw.slice(0, 10);
    return raw;
  }

  private normalizeTimeValue(raw: string): string {
    const timeMatch = /T(\d{2}:\d{2})/.exec(raw);
    if (timeMatch) return timeMatch[1];

    const plainMatch = /^(\d{2}:\d{2})/.exec(raw);
    if (plainMatch) return plainMatch[1];

    return raw;
  }

  onDraftProductChange(event: CustomEvent) {
    this.draftProductId.set(event.detail.value ?? '');
  }

  onDraftProductStatusChange(event: CustomEvent) {
    const nextStatus = event.detail.value as ClientProductStatus;
    if (
      nextStatus === ClientProductStatus.OFFERED ||
      nextStatus === ClientProductStatus.INTERESTED ||
      nextStatus === ClientProductStatus.SOLD ||
      nextStatus === ClientProductStatus.REJECTED
    ) {
      this.draftProductStatus.set(nextStatus);
    }
  }

  onDraftProductNotesChange(event: CustomEvent) {
    this.draftProductNotes.set(event.detail.value ?? '');
  }

  addProductToClient() {
    const fallbackProductId = this.products()[0]?.id;
    const productId = this.draftProductId() || fallbackProductId;
    if (!productId) return;

    this.salesCatalogStore.createClientProduct({
      clientId: this.client().id,
      productId,
      status: this.draftProductStatus(),
      notes: this.draftProductNotes().trim() || undefined,
    });

    this.draftProductId.set('');
    this.draftProductStatus.set(ClientProductStatus.OFFERED);
    this.draftProductNotes.set('');
  }

  statusColor(status: IClientAppointment['status']): string {
    if (status === 'scheduled') return 'primary';
    if (status === 'completed') return 'success';
    return 'danger';
  }

  offerStatusLabel(status: ClientProductStatus): string {
    if (status === ClientProductStatus.OFFERED) return 'Ofrecido';
    if (status === ClientProductStatus.INTERESTED) return 'Interesado';
    if (status === ClientProductStatus.SOLD) return 'Vendido';
    return 'Rechazado';
  }

  offerStatusColor(status: ClientProductStatus): string {
    if (status === ClientProductStatus.OFFERED) return 'primary';
    if (status === ClientProductStatus.INTERESTED) return 'warning';
    if (status === ClientProductStatus.SOLD) return 'success';
    return 'danger';
  }

  productName(productId: string): string {
    return (
      this.products().find((product) => product.id === productId)?.name ??
      'Producto desconocido'
    );
  }

  productPrice(productId: string): number | undefined {
    return this.products().find((product) => product.id === productId)?.price;
  }

  formatProductDate(dateIso: string): string {
    return new Date(dateIso).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  formatPrice(price?: number): string {
    if (price === undefined) return 'Sin precio';
    return this.priceFormatter.format(price);
  }

  quickSetProductStatus(offer: IClientProduct, status: ClientProductStatus) {
    if (offer.status === status) return;
    this.salesCatalogStore.updateClientProduct(offer.id, {
      status,
      updatedAt: new Date().toISOString(),
    });
  }

  async openEditProductNotesAlert(offer: IClientProduct) {
    const alert = await this.alertCtrl.create({
      header: 'Actualizar notas',
      inputs: [
        {
          name: 'notes',
          type: 'textarea',
          value: offer.notes ?? '',
          placeholder: 'Notas de seguimiento',
        },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (data: { notes?: string }) => {
            this.salesCatalogStore.updateClientProduct(offer.id, {
              notes: data.notes?.trim() || undefined,
              updatedAt: new Date().toISOString(),
            });
          },
        },
      ],
    });

    await alert.present();
  }

  async deleteProductOffer(offer: IClientProduct) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar registro',
      message: '¿Eliminar este vínculo cliente-producto?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.salesCatalogStore.deleteClientProduct(offer.id);
          },
        },
      ],
    });

    await alert.present();
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
