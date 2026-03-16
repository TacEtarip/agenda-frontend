import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ClientStage } from '../../enums/client-stage.enum';
import { ClientProductStatus } from '../../enums/client-product-status.enum';
import { IAttachment } from '../../interfaces/attachment.interface';
import { IClientAppointment } from '../../interfaces/client-appointment.interface';
import { IClientProduct } from '../../interfaces/client-product.interface';
import { IClient } from '../../interfaces/client.interface';
import { IMessageTemplate } from '../../interfaces/message-template.interface';
import { CLIENT_STAGE_OPTIONS, getStageLabel } from '../../shared/client-stage.utils';
import { INote } from '../../interfaces/note.interface';
import { COMMON_ION_PAGE_IMPORTS } from '../../shared/ionic-imports';
import { AppointmentStatusColorPipe, AppointmentStatusLabelPipe } from '../../shared/pipes/appointment-status.pipes';
import { FormatDatePipe } from '../../shared/pipes/format-date.pipe';
import { FormatPricePipe } from '../../shared/pipes/format-price.pipe';
import { OfferStatusColorPipe, OfferStatusLabelPipe } from '../../shared/pipes/offer-status.pipes';
import { StageLabelPipe, StageColorPipe } from '../../shared/pipes/stage.pipes';
import { SalesCatalogStore } from '../../shared/stores/sales-catalog.store';
import { MessageTemplateStore } from '../../shared/stores/message-template.store';
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
  closeOutline,
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

interface IEnrichedClientProduct extends IClientProduct {
  resolvedProductName: string;
  resolvedProductPrice: number | undefined;
}

@Component({
  selector: 'app-client-detail',
  host: { class: 'ion-page' },
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
    AppointmentStatusColorPipe,
    AppointmentStatusLabelPipe,
    FormatDatePipe,
    FormatPricePipe,
    OfferStatusColorPipe,
    OfferStatusLabelPipe,
    StageLabelPipe,
    StageColorPipe,
  ],
  templateUrl: './client-detail.html',
  styleUrl: './client-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly alertCtrl = inject(AlertController);
  private readonly salesCatalogStore = inject(SalesCatalogStore);
  private readonly messageTemplateStore = inject(MessageTemplateStore);
  readonly clientId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly allStages = CLIENT_STAGE_OPTIONS;

  readonly activeSegment = signal<Segment>('notes');
  readonly clientProductStatus = ClientProductStatus;
  readonly products = this.salesCatalogStore.products;
  readonly draftProductId = signal('');
  readonly draftProductStatus = signal<ClientProductStatus>(ClientProductStatus.OFFERED);
  readonly draftProductNotes = signal('');
  readonly isNoteModalOpen = signal(false);
  readonly editingNoteId = signal<string | null>(null);
  readonly noteDraft = signal('');
  readonly noteDraftError = signal<string | null>(null);
  readonly isAppointmentModalOpen = signal(false);
  readonly editingAppointmentId = signal<string | null>(null);
  readonly appointmentDraft = signal<IAppointmentDraft>(this.createDefaultAppointmentDraft());
  readonly appointmentDraftError = signal<string | null>(null);
  readonly isAttachmentModalOpen = signal(false);
  readonly attachmentDraft = signal(this.createDefaultAttachmentDraft());
  readonly attachmentDraftError = signal<string | null>(null);

  // Mock client data
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

  readonly currentClientProducts = computed((): IEnrichedClientProduct[] => {
    const productMap = new Map(
      this.salesCatalogStore.products().map((p) => [p.id, p]),
    );
    return this.salesCatalogStore
      .clientProducts()
      .filter((offer) => offer.clientId === this.client().id)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .map((offer) => {
        const product = productMap.get(offer.productId);
        return {
          ...offer,
          resolvedProductName: product?.name ?? 'Producto desconocido',
          resolvedProductPrice: product?.price,
        };
      });
  });

  readonly canShowPrimaryFab = computed(() => {
    const segment = this.activeSegment();
    return segment === 'notes' || segment === 'appointments' || segment === 'attachments';
  });

  readonly primaryFabLabel = computed(() => {
    const segment = this.activeSegment();
    if (segment === 'notes') return 'Agregar nota';
    if (segment === 'appointments') return 'Programar cita';
    if (segment === 'attachments') return 'Agregar archivo';
    return 'Agregar';
  });

  readonly messageTemplates = this.messageTemplateStore.templates;

  readonly currentStageTemplates = computed(() =>
    this.messageTemplates()
      .filter((template) => template.stage === this.client().stage)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
  );

  readonly callWhatsAppUrl = computed(
    () => `https://wa.me/${this.client().phone.replaceAll(' ', '')}`,
  );

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
      closeOutline,
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

  openPrimaryActionModal() {
    const segment = this.activeSegment();
    if (segment === 'notes') {
      this.openCreateNoteModal();
      return;
    }

    if (segment === 'appointments') {
      this.openCreateAppointmentModal();
      return;
    }

    if (segment === 'attachments') {
      this.openCreateAttachmentModal();
    }
  }

  openCreateNoteModal() {
    this.editingNoteId.set(null);
    this.noteDraft.set('');
    this.noteDraftError.set(null);
    this.isNoteModalOpen.set(true);
  }

  openEditNoteModal(note: INote) {
    this.editingNoteId.set(note.id);
    this.noteDraft.set(note.content);
    this.noteDraftError.set(null);
    this.isNoteModalOpen.set(true);
  }

  closeNoteModal() {
    this.isNoteModalOpen.set(false);
    this.editingNoteId.set(null);
    this.noteDraft.set('');
    this.noteDraftError.set(null);
  }

  onNoteDraftChange(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    this.noteDraft.set(target.value ?? '');
  }

  saveNoteFromModal() {
    const content = this.noteDraft().trim();
    if (!content) {
      this.noteDraftError.set('Escribe una nota antes de guardar.');
      return;
    }

    const today = this.formatAppointmentDay(new Date());
    const editingId = this.editingNoteId();

    if (editingId) {
      this.notes.update((notes) =>
        notes.map((note) =>
          note.id === editingId
            ? { ...note, content, updatedAt: today }
            : note,
        ),
      );
    } else {
      this.notes.update((notes) => [
        {
          id: `note-${Date.now()}`,
          content,
          createdAt: today,
          updatedAt: today,
        },
        ...notes,
      ]);
    }

    this.closeNoteModal();
  }

  async deleteNote(note: INote) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar nota',
      message: '¿Eliminar esta nota del cliente?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.notes.update((notes) => notes.filter((current) => current.id !== note.id));
          },
        },
      ],
    });

    await alert.present();
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

  openCreateAttachmentModal() {
    this.attachmentDraft.set(this.createDefaultAttachmentDraft());
    this.attachmentDraftError.set(null);
    this.isAttachmentModalOpen.set(true);
  }

  closeAttachmentModal() {
    this.isAttachmentModalOpen.set(false);
    this.attachmentDraft.set(this.createDefaultAttachmentDraft());
    this.attachmentDraftError.set(null);
  }

  onAttachmentFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    const selectedFile = target.files?.[0];
    if (!selectedFile) return;

    const attachmentType = this.resolveAttachmentType(selectedFile);
    this.attachmentDraft.set({
      fileName: selectedFile.name,
      fileType: attachmentType.label,
      fileSize: this.formatFileSize(selectedFile.size),
      icon: attachmentType.icon,
    });
    this.attachmentDraftError.set(null);
  }

  saveAttachmentFromModal() {
    const draft = this.attachmentDraft();
    if (!draft.fileName) {
      this.attachmentDraftError.set('Selecciona un archivo antes de guardar.');
      return;
    }

    this.attachments.update((attachments) => [
      {
        id: `file-${Date.now()}`,
        fileName: draft.fileName,
        fileType: draft.fileType,
        fileSize: draft.fileSize,
        uploadedAt: this.formatAppointmentDay(new Date()),
        icon: draft.icon,
      },
      ...attachments,
    ]);

    this.closeAttachmentModal();
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

  readonly appointmentDraftDateLabel = computed(() => {
    const dateValue = this.appointmentDraft().date;
    if (!dateValue) return 'Seleccionar fecha';
    const date = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(date.getTime())) return 'Seleccionar fecha';
    return this.formatAppointmentDay(date);
  });

  readonly appointmentDraftStartHourLabel = computed(() => this.appointmentDraft().startHour || '--:--');

  readonly appointmentDraftEndHourLabel = computed(() => this.appointmentDraft().endHour || '--:--');

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

  private createDefaultAttachmentDraft() {
    return {
      fileName: '',
      fileType: 'PDF',
      fileSize: '',
      icon: 'document-outline',
    };
  }

  private formatFileSize(sizeInBytes: number): string {
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private resolveAttachmentType(file: File): { label: string; icon: string } {
    if (file.type.startsWith('image/')) {
      return { label: 'Imagen', icon: 'image-outline' };
    }

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      return { label: 'PDF', icon: 'document-outline' };
    }

    return { label: 'Documento', icon: 'document-outline' };
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

  onStageChange(event: CustomEvent) {
    const newStage = event.detail.value as ClientStage;
    this.client.update((c) => ({ ...c, stage: newStage }));
  }

  async openEditTemplateAlert(template: IMessageTemplate | null) {
    const stage = template?.stage ?? this.client().stage;
    const alert = await this.alertCtrl.create({
      header: `${template ? 'Editar' : 'Crear'} plantilla — ${getStageLabel(stage)}`,
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
            if (!data.messageBody.trim()) return false;

            this.messageTemplateStore.saveTemplate({
              templateId: template?.id,
              stage,
              messageBody: data.messageBody,
            });
            return true;
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
            this.messageTemplateStore.deleteTemplate(template.id);
          },
        },
      ],
    });
    await alert.present();
  }

  personalizeTemplateMessage(template: IMessageTemplate): string {
    return template.messageBody.replace('{{name}}', this.client().firstName);
  }

  getTemplateWhatsAppUrl(template: IMessageTemplate): string {
    const phone = this.client().phone.replaceAll(/\D/g, '');
    const message = this.personalizeTemplateMessage(template);
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }
}

