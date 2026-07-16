import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AlertController } from '@ionic/angular';
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
  IonBackButton,
  IonCardHeader,
  IonCardTitle,
  IonDatetime,
  IonDatetimeButton,
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
import { PaymentStore } from '../../shared/stores/payment.store';
import { PaymentSourceType } from '../../enums/payment-source-type.enum';
import { PaymentStatus } from '../../enums/payment-status.enum';
import { ProductType } from '../../enums/product-type.enum';
import { IPayment } from '../../interfaces/payment.interface';
import { PaymentFormModal } from '../../shared/components/payment-form-modal/payment-form-modal';
import { IPaymentModalTarget } from './interfaces/payment-modal-target.interface';
import { buildPaymentCancellationAlert } from '../../shared/payment-cancellation.utils';
import { UserMenuComponent } from '../../shared/components/user-menu/user-menu';

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
    IonSegment,
    IonSegmentButton,
    IonNote,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonItem,
    IonLabel,
    RouterLink,
    AppointmentStatusColorPipe,
    AppointmentStatusLabelPipe,
    FormatDatePipe,
    FormatPricePipe,
    OfferStatusColorPipe,
    OfferStatusLabelPipe,
    StageLabelPipe,
    StageColorPipe,
    PaymentFormModal,
    UserMenuComponent,
  ],
  templateUrl: './client-detail.html',
  styleUrl: './client-detail.scss',
})
export class ClientDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);
  private readonly salesCatalogStore = inject(SalesCatalogStore);
  private readonly messageTemplateStore = inject(MessageTemplateStore);
  private readonly clientApi = inject(ClientApiService);
  private readonly noteApi = inject(NoteApiService);
  private readonly appointmentApi = inject(AppointmentApiService);
  private readonly paymentStore = inject(PaymentStore);
  private readonly destroyRef = inject(DestroyRef);
  readonly clientId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly allStages = CLIENT_STAGE_OPTIONS;

  readonly activeSegment = signal<ClientDetailSegment>(ClientDetailSegment.NOTES);
  readonly cancellingPaymentId = signal<string | null>(null);
  readonly clientProductStatus = ClientProductStatus;
  readonly products = this.salesCatalogStore.products;
  readonly draftProductId = signal('');
  readonly draftProductStatus = signal<ClientProductStatus>(ClientProductStatus.OFFERED);
  readonly draftProductCustomPrice = signal('');
  readonly draftProductQuantity = signal('1');
  readonly draftProductNotes = signal('');
  readonly productLinkError = signal<string | null>(null);
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
  readonly isClientEditModalOpen = signal(false);
  readonly clientEditDraft = signal({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
  });
  readonly clientEditDraftError = signal<string | null>(null);
  readonly isSavingClient = signal(false);
  readonly actionError = signal<string | null>(null);
  readonly paymentModalTarget = signal<IPaymentModalTarget | null>(null);
  readonly paymentSourceType = PaymentSourceType;
  readonly paymentStatus = PaymentStatus;
  readonly productType = ProductType;
  readonly payments = this.paymentStore.payments;

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
  readonly isEditingCompletedAppointment = computed(() => {
    const editingId = this.editingAppointmentId();
    return Boolean(
      editingId &&
        this.appointments().some(
          (appointment) => appointment.id === editingId && appointment.status === 'completed',
        ),
    );
  });

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
        const resolvedProductType = product?.type ?? ProductType.PRODUCT;
        const resolvedProductPrice = offer.customPrice ?? product?.price;
        const resolvedProductQuantity =
          resolvedProductType === ProductType.PRODUCT ? offer.quantity ?? 1 : undefined;
        return {
          ...offer,
          resolvedProductName: product?.name ?? 'Producto desconocido',
          resolvedProductPrice,
          resolvedProductQuantity,
          resolvedProductTotalPrice:
            resolvedProductPrice !== undefined && resolvedProductQuantity !== undefined
              ? resolvedProductPrice * resolvedProductQuantity
              : resolvedProductPrice,
          catalogProductPrice: product?.price,
          resolvedProductType,
        };
      });
  });

  readonly selectedDraftProduct = computed(() =>
    this.products().find((product) => product.id === this.draftProductId()),
  );

  readonly availableProducts = computed(() => {
    const linkedProductIds = new Set(
      this.currentClientProducts()
        .filter((offer) => offer.status !== ClientProductStatus.SOLD)
        .map((offer) => offer.productId),
    );
    return this.products().filter((product) => !linkedProductIds.has(product.id));
  });

  readonly messageTemplates = this.messageTemplateStore.templates;

  readonly currentStageTemplates = computed(() =>
    this.messageTemplates()
      .filter((template) => template.stage === this.client().stage)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );

  readonly otherStageTemplates = computed(() =>
    this.messageTemplates()
      .filter((template) => template.stage !== this.client().stage)
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

  readonly callPhoneUrl = computed(() => `tel:${this.client().phone.replaceAll(/\s/g, '')}`);
  readonly emailUrl = computed(() => `mailto:${this.client().email}`);

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
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (Object.values(ClientDetailSegment).includes(tab as ClientDetailSegment)) {
      this.activeSegment.set(tab as ClientDetailSegment);
    }
  }

  ionViewWillEnter(): void {
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
      this.paymentStore.load({ clientId: this.clientId, limit: 100 });
      this.salesCatalogStore.loadProducts();
      this.salesCatalogStore.loadClientProducts(this.clientId);
      this.messageTemplateStore.load();
    }
  }

  onSegmentChange(event: Event) {
    const segment = this.getEventValue<ClientDetailSegment>(event);
    if (!segment) return;
    this.activeSegment.set(segment);
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab: segment === ClientDetailSegment.NOTES ? null : segment }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  openEditClientModal() {
    const client = this.client();
    this.clientEditDraft.set({
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phoneNumber: client.phone,
    });
    this.clientEditDraftError.set(null);
    this.isClientEditModalOpen.set(true);
  }

  closeEditClientModal() {
    if (this.isSavingClient()) return;
    this.isClientEditModalOpen.set(false);
    this.clientEditDraftError.set(null);
  }

  onClientEditDraftChange(
    field: 'firstName' | 'lastName' | 'email' | 'phoneNumber',
    event: Event,
  ) {
    const target = event.target as HTMLInputElement;
    this.clientEditDraft.update((draft) => ({
      ...draft,
      [field]: target.value ?? '',
    }));
  }

  saveClientFromModal() {
    if (this.isSavingClient()) return;

    const draft = this.clientEditDraft();
    const firstName = draft.firstName.trim();
    const lastName = draft.lastName.trim();
    const email = draft.email.trim();
    const phoneNumber = draft.phoneNumber.trim();

    if (!firstName || !lastName || !phoneNumber) {
      this.clientEditDraftError.set('Completa nombre, apellido y teléfono.');
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.clientEditDraftError.set('Ingresa un correo válido.');
      return;
    }

    this.isSavingClient.set(true);
    this.clientEditDraftError.set(null);
    this.clientApi
      .update(this.clientId, {
        firstName,
        lastName,
        email: email || undefined,
        phoneNumber,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ client }) => {
          this.client.set(client);
          this.isSavingClient.set(false);
          this.isClientEditModalOpen.set(false);
        },
        error: () => {
          this.isSavingClient.set(false);
          this.clientEditDraftError.set('No se pudo actualizar el cliente.');
        },
      });
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
    const editingId = this.editingAppointmentId();
    const editingAppointment = editingId
      ? this.appointments().find((appointment) => appointment.id === editingId)
      : undefined;

    if (editingId && editingAppointment?.status === 'completed') {
      this.appointmentApi
        .update(editingId, { description: draft.description.trim() })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (updated) => {
            this.appointments.update((appts) =>
              appts.map((appointment) =>
                appointment.id === editingId ? this.mapApiAppointment(updated) : appointment,
              ),
            );
            this.closeAppointmentModal();
          },
          error: () => {
            this.actionError.set('No se pudo actualizar la descripción de la cita.');
          },
        });
      return;
    }

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

    if (editingId) {
      this.appointmentApi
        .update(editingId, {
          title,
          description: draft.description.trim() || undefined,
          startTime: startAt,
          endTime: endAt,
          ...(editingAppointment?.status === 'cancelled'
            ? { status: 'scheduled' as const }
            : {}),
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
          title,
          description: draft.description.trim() || undefined,
          startTime: startAt,
          endTime: endAt,
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
    if (appointment.status === 'completed') {
      this.actionError.set('Las citas completadas no se pueden modificar.');
      return;
    }
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
    const productId = this.getEventValue<string>(event) ?? '';
    this.draftProductId.set(productId);
    const product = this.products().find((item) => item.id === productId);
    this.draftProductCustomPrice.set(product?.price?.toFixed(2) ?? '');
    this.draftProductQuantity.set(product?.type === ProductType.PRODUCT ? '1' : '');
    this.productLinkError.set(null);
  }

  onDraftProductStatusChange(event: Event) {
    const nextStatus = this.getEventValue<ClientProductStatus>(event);
    if (!nextStatus) return;
    if (
      nextStatus === ClientProductStatus.OFFERED ||
      nextStatus === ClientProductStatus.INTERESTED ||
      nextStatus === ClientProductStatus.REJECTED
    ) {
      this.draftProductStatus.set(nextStatus);
    }
  }

  onDraftProductNotesChange(event: CustomEvent) {
    this.draftProductNotes.set(event.detail.value ?? '');
  }

  onDraftProductCustomPriceChange(event: Event) {
    const input = event.target as HTMLIonInputElement;
    const sanitized = this.sanitizePriceInput(
      String((event as CustomEvent<{ value?: string | number | null }>).detail.value ?? ''),
    );
    input.value = sanitized;
    this.draftProductCustomPrice.set(sanitized);
    this.productLinkError.set(null);
  }

  onDraftProductQuantityChange(event: Event) {
    const input = event.target as HTMLIonInputElement;
    const sanitized = String((event as CustomEvent<{ value?: string | number | null }>).detail.value ?? '')
      .replace(/\D/g, '')
      .replace(/^0+/, '');
    input.value = sanitized;
    this.draftProductQuantity.set(sanitized);
    this.productLinkError.set(null);
  }

  formatDraftProductCustomPrice() {
    const value = this.parseOptionalPrice(this.draftProductCustomPrice());
    if (value !== undefined) this.draftProductCustomPrice.set(value.toFixed(2));
  }

  addProductToClient() {
    const productId = this.draftProductId();
    if (!productId) {
      this.productLinkError.set('Selecciona un producto antes de agregarlo.');
      return;
    }

    if (
      this.currentClientProducts().some(
        (offer) =>
          offer.productId === productId &&
          offer.status !== ClientProductStatus.SOLD,
      )
    ) {
      this.productLinkError.set('Este producto ya está vinculado al cliente.');
      this.draftProductId.set('');
      return;
    }

    const customPrice = this.parseOptionalPrice(this.draftProductCustomPrice());
    if (this.draftProductCustomPrice().trim() && customPrice === undefined) {
      this.productLinkError.set('Ingresa un precio válido.');
      return;
    }

    const selectedProduct = this.selectedDraftProduct();
    const isProduct = selectedProduct?.type === ProductType.PRODUCT;
    let quantity: number | undefined;
    if (isProduct) {
      const parsedQuantity = Number(this.draftProductQuantity());
      if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
        this.productLinkError.set('Ingresa una cantidad válida.');
        return;
      }
      quantity = parsedQuantity;
    }

    this.productLinkError.set(null);
    this.salesCatalogStore.createClientProduct({
      clientId: this.client().id,
      productId,
      status: this.draftProductStatus(),
      customPrice,
      quantity,
      notes: this.draftProductNotes().trim() || undefined,
    });

    this.draftProductId.set('');
    this.draftProductStatus.set(ClientProductStatus.OFFERED);
    this.draftProductCustomPrice.set('');
    this.draftProductQuantity.set('1');
    this.draftProductNotes.set('');
  }

  quickSetProductStatus(offer: IClientProduct, status: ClientProductStatus, force = false) {
    if (!force && status === ClientProductStatus.SOLD) {
      this.actionError.set('El estado vendido solo se asigna cuando el cobro está pagado.');
      return;
    }
    if (!force && this.isClientProductPaid(offer.id)) {
      this.actionError.set('Este producto ya tiene un pago realizado y no se puede modificar.');
      return;
    }
    if (offer.status === status) return;
    this.salesCatalogStore.updateClientProduct(offer.id, {
      status,
      updatedAt: new Date().toISOString(),
    });
  }

  async openEditProductNotesAlert(offer: IClientProduct) {
    if (this.isClientProductPaid(offer.id)) {
      this.actionError.set('Este producto ya tiene un pago realizado y no se puede modificar.');
      return;
    }

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

  async openEditProductPriceAlert(offer: IEnrichedClientProduct) {
    if (this.isClientProductPaid(offer.id)) {
      this.actionError.set('Este producto ya tiene un pago realizado y no se puede modificar.');
      return;
    }

    const inputs: any[] = [
      {
        name: 'customPrice',
        type: 'number',
        value: offer.resolvedProductPrice?.toFixed(2) ?? '',
        placeholder: 'Precio para este cliente',
        min: 0,
        attributes: {
          inputmode: 'decimal',
          step: '0.01',
        },
      },
    ];
    if (offer.resolvedProductType === ProductType.PRODUCT) {
      inputs.push({
        name: 'quantity',
        type: 'number',
        value: String(offer.resolvedProductQuantity ?? 1),
        placeholder: 'Cantidad',
        min: 1,
        attributes: {
          inputmode: 'numeric',
          step: '1',
        },
      });
    }

    const alert = await this.alertCtrl.create({
      header: offer.resolvedProductType === ProductType.PRODUCT
        ? 'Cambiar precio y cantidad'
        : 'Cambiar precio',
      inputs,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Usar precio de catálogo',
          handler: () => {
            this.salesCatalogStore.updateClientProduct(offer.id, {
              customPrice: null,
              quantity: offer.resolvedProductType === ProductType.PRODUCT ? offer.resolvedProductQuantity : null,
              updatedAt: new Date().toISOString(),
            });
          },
        },
        {
          text: 'Guardar',
          handler: (data: { customPrice?: string | number; quantity?: string | number }) => {
            const customPrice = this.parseOptionalPrice(data.customPrice);
            if (customPrice === undefined) return false;
            let quantity: number | undefined;
            if (offer.resolvedProductType === ProductType.PRODUCT) {
              const parsedQuantity = Number(data.quantity);
              if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
                return false;
              }
              quantity = parsedQuantity;
            }
            this.salesCatalogStore.updateClientProduct(offer.id, {
              customPrice,
              quantity,
              updatedAt: new Date().toISOString(),
            });
            return true;
          },
        },
      ],
    });

    await alert.present();
  }

  async deleteProductOffer(offer: IClientProduct) {
    if (this.isClientProductPaid(offer.id)) {
      this.actionError.set('Este producto ya tiene un pago realizado y no se puede eliminar.');
      return;
    }

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

  async openEditTemplateAlert(template: IMessageTemplate) {
    const stage = template.stage;
    const alert = await this.alertCtrl.create({
      header: `Editar plantilla — ${getStageLabel(stage)}`,
      inputs: [
        {
          name: 'messageBody',
          type: 'textarea',
          placeholder: 'Escribe tu plantilla aquí. Usa {{name}} para el nombre del cliente.',
          value: template.messageBody,
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
              templateId: template.id,
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

  openAppointmentPayment(appointment: IClientAppointment): void {
    this.paymentModalTarget.set({
      sourceType: PaymentSourceType.APPOINTMENT,
      sourceId: appointment.id,
      concept: appointment.title,
    });
  }

  openProductPayment(offer: IEnrichedClientProduct): void {
    this.paymentModalTarget.set({
      sourceType: PaymentSourceType.CLIENT_PRODUCT,
      sourceId: offer.id,
      concept: offer.resolvedProductName,
      amount: offer.resolvedProductTotalPrice,
    });
  }

  closePaymentModal(): void {
    this.paymentModalTarget.set(null);
  }

  paymentFor(sourceType: PaymentSourceType, sourceId: string): IPayment | undefined {
    return this.payments().find(
      (payment) =>
        payment.sourceType === sourceType &&
        payment.sourceId === sourceId &&
        (payment.status === PaymentStatus.PAID || payment.status === PaymentStatus.PENDING),
    );
  }

  isClientProductPaid(sourceId: string): boolean {
    return this.payments().some(
      (payment) =>
        payment.sourceType === PaymentSourceType.CLIENT_PRODUCT &&
        payment.sourceId === sourceId &&
        payment.status === PaymentStatus.PAID,
    );
  }

  onPaymentCompleted(payment: IPayment): void {
    if (payment.status === PaymentStatus.PAID && payment.sourceType === PaymentSourceType.CLIENT_PRODUCT) {
      const offer = this.currentClientProducts().find((item) => item.id === payment.sourceId);
      if (offer && offer.status !== ClientProductStatus.SOLD) {
        this.quickSetProductStatus(offer, ClientProductStatus.SOLD, true);
      }
    }
  }

  async copyPaymentLink(payment: IPayment): Promise<void> {
    if (payment.checkoutUrl) await navigator.clipboard.writeText(payment.checkoutUrl);
  }

  sendPaymentLink(payment: IPayment): void {
    if (!payment.checkoutUrl) return;
    const phone = this.client().phone.replace(/\D/g, '');
    const message = `Hola ${this.client().firstName}. Te compartimos el enlace de pago por ${payment.description} (${payment.amount.toFixed(2)} PEN): ${payment.checkoutUrl}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  }

  async cancelPayment(payment: IPayment): Promise<void> {
    if (this.cancellingPaymentId()) return;
    const client = this.client();
    const clientName = `${client.firstName} ${client.lastName}`.trim();
    const alert = await this.alertCtrl.create(
      buildPaymentCancellationAlert(clientName, payment.amount, () => this.performPaymentCancellation(payment)),
    );
    await alert.present();
  }

  private performPaymentCancellation(payment: IPayment): void {
    this.actionError.set(null);
    this.cancellingPaymentId.set(payment.id);
    this.paymentStore.cancel(payment.id).subscribe({
      next: () => this.cancellingPaymentId.set(null),
      error: () => {
        this.cancellingPaymentId.set(null);
        this.actionError.set('No se pudo cancelar el cobro. Intenta nuevamente.');
      },
    });
  }

  paymentStatusLabel(status: PaymentStatus): string {
    return ({
      [PaymentStatus.PENDING]: 'Pago pendiente',
      [PaymentStatus.PAID]: 'Pagado',
      [PaymentStatus.FAILED]: 'Fallido',
      [PaymentStatus.CANCELLED]: 'Cancelado',
      [PaymentStatus.REFUNDED]: 'Reembolsado',
    })[status];
  }

  private getEventValue<T>(event: Event): T | null {
    const value = (event as CustomEvent<{ value?: T }>).detail?.value;
    return value ?? null;
  }

  private sanitizePriceInput(rawValue: string): string {
    const normalized = rawValue.replace(',', '.').replace(/[^\d.]/g, '');
    const [integer = '', ...decimalParts] = normalized.split('.');
    return decimalParts.length
      ? `${integer}.${decimalParts.join('').slice(0, 2)}`
      : integer;
  }

  private parseOptionalPrice(rawValue: string | number | undefined): number | undefined {
    const normalized = String(rawValue ?? '').replace(',', '.').trim();
    if (!normalized) return undefined;
    const value = Number(normalized);
    if (!Number.isFinite(value) || value < 0) return undefined;
    return Math.round(value * 100) / 100;
  }
}
