import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { ClientApiService } from '../../core/services/client-api.service';
import { NoteApiService } from '../../core/services/note-api.service';
import { AppointmentApiService } from '../../core/services/appointment-api.service';
import { AuthService } from '../../core/services/auth.service';
import { IAppointmentApi } from '../../core/interfaces/appointment-api.interface';
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
  IonDatetime,
  IonDatetimeButton,
  IonFab,
  IonFabButton,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonToggle,
  IonItem,
  IonLabel,
} from '@ionic/angular/standalone';
import { ClientDetailSegment } from './enums/client-detail-segment.enum';
import { IAppointmentDraft } from './interfaces/appointment-draft.interface';
import { IEnrichedClientProduct } from './interfaces/enriched-client-product.interface';

import { SETTINGS_STORAGE_KEY } from '../settings/constants/settings.constants';
import { IUserSettingsStorage } from '../settings/interfaces/user-settings-storage.interface';

@Component({
  selector: 'app-client-detail',
  host: { class: 'ion-page' },
  imports: [
    ...COMMON_ION_PAGE_IMPORTS,
    IonBackButton,
    IonCardHeader,
    IonCardTitle,
    IonDatetime,
    IonDatetimeButton,
    IonFab,
    IonFabButton,
    IonSegment,
    IonSegmentButton,
    IonNote,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonToggle,
    IonItem,
    IonLabel,
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
})
export class ClientDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly alertCtrl = inject(AlertController);
  private readonly salesCatalogStore = inject(SalesCatalogStore);
  private readonly messageTemplateStore = inject(MessageTemplateStore);
  private readonly clientApi = inject(ClientApiService);
  private readonly noteApi = inject(NoteApiService);
  private readonly appointmentApi = inject(AppointmentApiService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  readonly clientId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly allStages = CLIENT_STAGE_OPTIONS;

  readonly activeSegment = signal<ClientDetailSegment>(ClientDetailSegment.NOTES);
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
  readonly actionError = signal<string | null>(null);

  // Client data loaded from API
  readonly client = signal<IClient>({
    id: this.clientId,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    initials: '?',
    color: 'avatar--sky',
    createdAt: '',
    stage: ClientStage.FIRST_CONTACT,
  });

  readonly notes = signal<INote[]>([]);

  readonly appointments = signal<IClientAppointment[]>([]);

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
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
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
    return (
      segment === ClientDetailSegment.NOTES ||
      segment === ClientDetailSegment.APPOINTMENTS ||
      segment === ClientDetailSegment.ATTACHMENTS
    );
  });

  readonly primaryFabLabel = computed(() => {
    const segment = this.activeSegment();
    if (segment === ClientDetailSegment.NOTES) return 'Agregar nota';
    if (segment === ClientDetailSegment.APPOINTMENTS) return 'Programar cita';
    if (segment === ClientDetailSegment.ATTACHMENTS) return 'Agregar archivo';
    return 'Agregar';
  });

  readonly messageTemplates = this.messageTemplateStore.templates;

  readonly currentStageTemplates = computed(() =>
    this.messageTemplates()
      .filter((template) => template.stage === this.client().stage)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );

  readonly callWhatsAppUrl = computed(() => {
    const templates = this.currentStageTemplates();
    const phone = this.client().phone.replaceAll(/\D/g, '');

    if (templates.length > 0) {
      const template = templates[0];
      const message = template.messageBody.replace('{{name}}', this.client().firstName);
      return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    }

    return `https://wa.me/${phone}`;
  });

  readonly paymentsEnabled = computed(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as Partial<IUserSettingsStorage>;
      return parsed.enablePayments === true;
    } catch {
      return false;
    }
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

  ionViewWillEnter(): void {
    const userId = this.authService.currentUser()?.userId;

    if (this.clientId) {
      this.clientApi
        .getById(this.clientId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((client) => this.client.set(client));

      this.noteApi
        .getAllByClient(this.clientId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((notes) => this.notes.set(notes));

      this.appointmentApi
        .getAllByClient(this.clientId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((appts) => this.appointments.set(appts.map((a) => this.mapApiAppointment(a))));
    }

    if (userId) {
      this.salesCatalogStore.loadProducts(userId);
      this.salesCatalogStore.loadClientProducts(this.clientId);
      this.messageTemplateStore.load(userId);
    }
  }

  onSegmentChange(event: Event) {
    const segment = this.getEventValue<ClientDetailSegment>(event);
    if (!segment) return;
    this.activeSegment.set(segment);
  }

  openPrimaryActionModal() {
    const segment = this.activeSegment();
    if (segment === ClientDetailSegment.NOTES) {
      this.openCreateNoteModal();
      return;
    }

    if (segment === ClientDetailSegment.APPOINTMENTS) {
      this.openCreateAppointmentModal();
      return;
    }

    if (segment === ClientDetailSegment.ATTACHMENTS) {
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
    this.actionError.set(null);
    const content = this.noteDraft().trim();
    if (!content) {
      this.noteDraftError.set('Escribe una nota antes de guardar.');
      return;
    }

    const editingId = this.editingNoteId();

    if (editingId) {
      this.noteApi
        .update(editingId, { content })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (updated) => {
            this.notes.update((notes) =>
              notes.map((n) => (n.id === editingId ? updated : n)),
            );
            this.closeNoteModal();
          },
          error: () => {
            this.actionError.set('No se pudo actualizar la nota.');
          },
        });
    } else {
      this.noteApi
        .create({ clientId: this.clientId, content })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (created) => {
            this.notes.update((notes) => [created, ...notes]);
            this.closeNoteModal();
          },
          error: () => {
            this.actionError.set('No se pudo guardar la nota.');
          },
        });
    }
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
          handler: () => this.confirmDeleteNote(note.id),
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
      requestPaymentLink: false, // On edit, we don't request payment link again
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
    event: Event,
  ) {
    const value = this.getEventValue<string | string[]>(event);
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

  onAppointmentDraftCheckboxChange(
    field: 'requestPaymentLink',
    event: Event,
  ) {
    const isChecked = Boolean((event as CustomEvent<{ checked?: boolean }>).detail?.checked);
    this.appointmentDraft.update((draft) => ({
      ...draft,
      [field]: isChecked,
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
    this.actionError.set(null);
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

    const userId = this.authService.currentUser()?.userId ?? '';
    const editingId = this.editingAppointmentId();

    if (editingId) {
      this.appointmentApi
        .update(editingId, {
          title,
          description: draft.description.trim() || undefined,
          startTime: startAt,
          endTime: endAt,
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (updated) => {
            this.appointments.update((appts) =>
              appts.map((a) => (a.id === editingId ? this.mapApiAppointment(updated) : a)),
            );
            this.closeAppointmentModal();
          },
          error: () => {
            this.actionError.set('No se pudo actualizar la cita.');
          },
        });
    } else {
      this.appointmentApi
        .create({
          clientId: this.clientId,
          userId,
          title,
          description: draft.description.trim() || undefined,
          startTime: startAt,
          endTime: endAt,
          requestPaymentLink: draft.requestPaymentLink === true,
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (created) => {
            this.appointments.update((appts) => [this.mapApiAppointment(created), ...appts]);
            this.closeAppointmentModal();
          },
          error: () => {
            this.actionError.set('No se pudo crear la cita.');
          },
        });
    }
  }

  updateAppointmentStatus(
    appointment: IClientAppointment,
    status: IClientAppointment['status'],
  ) {
    if (appointment.status === status) return;
    this.actionError.set(null);
    this.appointmentApi
      .update(appointment.id, { status })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.appointments.update((appts) =>
            appts.map((item) =>
              item.id === appointment.id ? this.mapApiAppointment(updated) : item,
            ),
          );
        },
        error: () => {
          this.actionError.set('No se pudo actualizar el estado de la cita.');
        },
      });
  }

  private mapApiAppointment(a: IAppointmentApi): IClientAppointment {
    const startDate = new Date(a.startTime);
    const endDate = new Date(a.endTime);
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      startAt: a.startTime,
      endAt: a.endTime,
      startTime: `${this.formatAppointmentDay(startDate)} · ${this.formatAppointmentHour(startDate)}`,
      endTime: this.formatAppointmentHour(endDate),
      status: a.status,
      paymentId: a.paymentId,
      paymentUrl: a.paymentUrl,
    };
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
      requestPaymentLink: false,
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

  onDraftProductChange(event: Event) {
    this.draftProductId.set(this.getEventValue<string>(event) ?? '');
  }

  onDraftProductStatusChange(event: Event) {
    const nextStatus = this.getEventValue<ClientProductStatus>(event);
    if (!nextStatus) return;
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

  onStageChange(event: Event) {
    const newStage = this.getEventValue<ClientStage>(event);
    if (!newStage) return;
    if (this.client().stage === newStage) return;

    this.actionError.set(null);
    this.clientApi.update(this.clientId, { stage: newStage }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ client }) => {
        this.client.update((current) => ({
          ...current,
          ...client,
        }));
      },
      error: () => {
        this.actionError.set('No se pudo actualizar la etapa del cliente.');
      },
    });
  }

  private confirmDeleteNote(noteId: string): void {
    this.actionError.set(null);
    this.noteApi
      .remove(noteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notes.update((notes) => notes.filter((note) => note.id !== noteId));
        },
        error: () => {
          this.actionError.set('No se pudo eliminar la nota.');
        },
      });
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

  private getEventValue<T>(event: Event): T | null {
    const value = (event as CustomEvent<{ value?: T }>).detail?.value;
    return value ?? null;
  }
}
