import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  catchError,
  filter,
  finalize,
  map,
  of,
  Subject,
  switchMap,
  take,
  takeWhile,
  timer,
} from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
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
import {
  AppointmentStatusColorPipe,
  AppointmentStatusLabelPipe,
} from '../../shared/pipes/appointment-status.pipes';
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
  logoGoogle,
  syncOutline,
  cloudDoneOutline,
  alertCircleOutline,
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
import {
  APPOINTMENT_FILTER_OPTIONS,
  AppointmentFilter,
  filterAndSortAppointments,
} from './appointment-list.utils';
import { roundUpToNextMinutes, validateAppointmentSchedule } from './appointment-schedule.utils';
import { buildAppointmentCancellationAlert } from './appointment-cancellation.utils';
import {
  AppointmentAvailabilityViewState,
  appointmentAvailabilityMessage,
  availabilityStateFromResult,
} from './appointment-availability.utils';
import { ICheckAppointmentAvailabilityPayload } from '../../core/interfaces/appointment-availability-api.interface';
import { interpolateTemplate } from '../../shared/template-interpolation.utils';

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
  private readonly pollingCalendarAppointmentIds = new Set<string>();
  private readonly isViewActive = signal(false);
  private readonly appointmentAvailabilityRequests =
    new Subject<ICheckAppointmentAvailabilityPayload>();

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
  readonly initialNoteDraft = signal('');
  readonly noteDraftError = signal<string | null>(null);
  readonly isAppointmentModalOpen = signal(false);
  readonly editingAppointmentId = signal<string | null>(null);
  readonly appointmentDraft = signal<IAppointmentDraft>(this.createDefaultAppointmentDraft());
  readonly initialAppointmentDraft = signal<IAppointmentDraft>(this.createDefaultAppointmentDraft());
  readonly appointmentDraftError = signal<string | null>(null);
  readonly appointmentAvailability = signal<AppointmentAvailabilityViewState>({
    status: 'idle',
  });
  readonly minimumAppointmentDate = signal(this.formatDateLocal(new Date()));
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
  readonly initialClientEditDraft = signal(this.clientEditDraft());
  readonly clientEditDraftError = signal<string | null>(null);
  readonly isSavingClient = signal(false);
  readonly actionError = signal<string | null>(null);
  readonly clientLoading = signal(true);
  readonly clientLoadError = signal<string | null>(null);
  readonly clientNotFound = signal(false);
  readonly hasValidClient = computed(() => !this.clientLoading() && !this.clientLoadError() && !this.clientNotFound() && Boolean(this.client().id));
  readonly retryingCalendarAppointmentId = signal<string | null>(null);
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
  readonly appointmentFilter = signal<AppointmentFilter>('not-cancelled');
  readonly appointmentFilterOptions = APPOINTMENT_FILTER_OPTIONS;
  readonly visibleAppointments = computed(() =>
    filterAndSortAppointments(this.appointments(), this.appointmentFilter()),
  );
  readonly isEditingCompletedAppointment = computed(() => {
    const editingId = this.editingAppointmentId();
    return Boolean(
      editingId &&
      this.appointments().some(
        (appointment) => appointment.id === editingId && appointment.status === 'completed',
      ),
    );
  });
  readonly appointmentDraftScheduleError = computed(() => {
    if (this.isEditingCompletedAppointment()) return null;
    const { date, startHour, endHour } = this.appointmentDraft();
    if (!date || !startHour || !endHour) return null;

    return validateAppointmentSchedule(
      new Date(`${date}T${startHour}`),
      new Date(`${date}T${endHour}`),
    );
  });
  readonly appointmentAvailabilityMessage = computed(() =>
    appointmentAvailabilityMessage(this.appointmentAvailability()),
  );
  readonly isAppointmentSaveDisabled = computed(() => {
    if (this.isEditingCompletedAppointment()) return false;
    if (this.appointmentDraftScheduleError() !== null) return true;
    return ['checking', 'conflict', 'error'].includes(this.appointmentAvailability().status);
  });

  readonly attachments = signal<IAttachment[]>([]);

  readonly currentClientProducts = computed((): IEnrichedClientProduct[] => {
    const productMap = new Map(this.salesCatalogStore.products().map((p) => [p.id, p]));
    return this.salesCatalogStore
      .clientProducts()
      .filter((offer) => offer.clientId === this.client().id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((offer) => {
        const product = productMap.get(offer.productId);
        const resolvedProductType = product?.type ?? ProductType.PRODUCT;
        const resolvedProductPrice = offer.customPrice ?? product?.price;
        const resolvedProductQuantity =
          resolvedProductType === ProductType.PRODUCT ? (offer.quantity ?? 1) : undefined;
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
      const rendered = this.renderTemplate(template);
      if (rendered.unresolvedTokens.length > 0) return `https://wa.me/${phone}`;
      return `https://wa.me/${phone}?text=${encodeURIComponent(rendered.message)}`;
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
      logoGoogle,
      syncOutline,
      cloudDoneOutline,
      alertCircleOutline,
    });
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (Object.values(ClientDetailSegment).includes(tab as ClientDetailSegment)) {
      this.activeSegment.set(tab as ClientDetailSegment);
    }
    timer(15_000, 15_000)
      .pipe(
        filter(
          () => this.isViewActive() && this.activeSegment() === ClientDetailSegment.APPOINTMENTS,
        ),
        switchMap(() => this.appointmentApi.getAllByClient(this.clientId)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (appointments) =>
          this.appointments.set(
            appointments.map((appointment) => this.mapApiAppointment(appointment)),
          ),
        error: () => undefined,
      });
    this.appointmentAvailabilityRequests
      .pipe(
        switchMap((request) =>
          timer(300).pipe(
            switchMap(() => this.appointmentApi.checkAvailability(request)),
            map((result) => availabilityStateFromResult(result)),
            catchError((error: unknown) => of(this.availabilityErrorState(error))),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => this.appointmentAvailability.set(state));
  }

  ionViewWillEnter(): void {
    this.isViewActive.set(true);
    if (this.clientId) {
      this.loadClient();

      this.noteApi
        .getAllByClient(this.clientId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((notes) => this.notes.set(notes));

      this.appointmentApi
        .getAllByClient(this.clientId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((appts) => {
          this.appointments.set(appts.map((a) => this.mapApiAppointment(a)));
          for (const appointment of appts) {
            if (appointment.calendarSyncStatus === 'pending') {
              this.refreshAppointmentSyncStatus(appointment.id);
            }
          }
        });
      this.paymentStore.load({ clientId: this.clientId, limit: 100 });
      this.salesCatalogStore.loadProducts();
      this.salesCatalogStore.loadClientProducts(this.clientId);
      this.messageTemplateStore.load();
    }
  }

  loadClient(): void {
    if (!this.clientId) {
      this.clientLoading.set(false);
      this.clientNotFound.set(true);
      return;
    }
    this.clientLoading.set(true);
    this.clientLoadError.set(null);
    this.clientNotFound.set(false);
    this.clientApi.getById(this.clientId).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.clientLoading.set(false)),
    ).subscribe({
      next: (client) => this.client.set(client),
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) this.clientNotFound.set(true);
        else this.clientLoadError.set('No se pudo cargar la información del cliente.');
      },
    });
  }

  ionViewWillLeave(): void {
    this.isViewActive.set(false);
  }

  onSegmentChange(event: Event) {
    const segment = this.getEventValue<ClientDetailSegment>(event);
    if (!segment) return;
    this.activeSegment.set(segment);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: segment === ClientDetailSegment.NOTES ? null : segment },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  openEditClientModal() {
    const client = this.client();
    this.clientEditDraft.set({
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phoneNumber: client.phone,
    });
    this.initialClientEditDraft.set(this.clientEditDraft());
    this.clientEditDraftError.set(null);
    this.isClientEditModalOpen.set(true);
  }

  closeEditClientModal() {
    if (this.isSavingClient()) return;
    this.isClientEditModalOpen.set(false);
    this.clientEditDraftError.set(null);
  }

  readonly canDismissClientEdit = async (): Promise<boolean> =>
    !this.isSavingClient() && (
      JSON.stringify(this.clientEditDraft()) === JSON.stringify(this.initialClientEditDraft()) ||
      this.confirmDiscard('cliente')
    );

  async requestCloseEditClientModal(): Promise<void> {
    if (await this.canDismissClientEdit()) this.closeEditClientModal();
  }

  onClientEditDraftChange(field: 'firstName' | 'lastName' | 'email' | 'phoneNumber', event: Event) {
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
    this.initialNoteDraft.set('');
    this.noteDraftError.set(null);
    this.isNoteModalOpen.set(true);
  }

  openEditNoteModal(note: INote) {
    this.editingNoteId.set(note.id);
    this.noteDraft.set(note.content);
    this.initialNoteDraft.set(note.content);
    this.noteDraftError.set(null);
    this.isNoteModalOpen.set(true);
  }

  closeNoteModal() {
    this.isNoteModalOpen.set(false);
    this.editingNoteId.set(null);
    this.noteDraft.set('');
    this.noteDraftError.set(null);
  }

  readonly canDismissNote = async (): Promise<boolean> =>
    this.noteDraft() === this.initialNoteDraft() || this.confirmDiscard('nota');

  async requestCloseNoteModal(): Promise<void> {
    if (await this.canDismissNote()) this.closeNoteModal();
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
            this.notes.update((notes) => notes.map((n) => (n.id === editingId ? updated : n)));
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
    this.minimumAppointmentDate.set(this.formatDateLocal(new Date()));
    this.editingAppointmentId.set(null);
    this.appointmentDraft.set(this.createDefaultAppointmentDraft());
    this.initialAppointmentDraft.set(this.appointmentDraft());
    this.appointmentDraftError.set(null);
    this.isAppointmentModalOpen.set(true);
    this.queueAppointmentAvailabilityCheck();
  }

  openEditAppointmentModal(appointment: IClientAppointment) {
    this.minimumAppointmentDate.set(this.formatDateLocal(new Date()));
    const fallbackDraft = this.createDefaultAppointmentDraft();
    const startAt = appointment.startAt ?? `${fallbackDraft.date}T${fallbackDraft.startHour}`;
    const endAt = appointment.endAt ?? `${fallbackDraft.date}T${fallbackDraft.endHour}`;

    this.editingAppointmentId.set(appointment.id);
    this.appointmentDraft.set({
      title: appointment.title,
      description: appointment.description ?? '',
      date: this.formatAppointmentInputDate(new Date(startAt)),
      startHour: this.formatAppointmentInputHour(new Date(startAt)),
      endHour: this.formatAppointmentInputHour(new Date(endAt)),
    });
    this.initialAppointmentDraft.set(this.appointmentDraft());
    this.appointmentDraftError.set(null);
    this.isAppointmentModalOpen.set(true);
    this.queueAppointmentAvailabilityCheck();
  }

  closeAppointmentModal() {
    this.isAppointmentModalOpen.set(false);
    this.appointmentDraftError.set(null);
    this.appointmentAvailability.set({ status: 'idle' });
  }

  readonly canDismissAppointment = async (): Promise<boolean> =>
    JSON.stringify(this.appointmentDraft()) === JSON.stringify(this.initialAppointmentDraft()) ||
    this.confirmDiscard('cita');

  async requestCloseAppointmentModal(): Promise<void> {
    if (await this.canDismissAppointment()) this.closeAppointmentModal();
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

  onAppointmentDraftTextChange(field: 'title' | 'description', event: Event) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.appointmentDraft.update((draft) => ({
      ...draft,
      [field]: target.value ?? '',
    }));
  }

  onAppointmentDraftDateChange(field: 'date' | 'startHour' | 'endHour', event: Event) {
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
    this.queueAppointmentAvailabilityCheck();
  }

  readonly appointmentDraftDateLabel = computed(() => {
    const dateValue = this.appointmentDraft().date;
    if (!dateValue) return 'Seleccionar fecha';
    const date = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(date.getTime())) return 'Seleccionar fecha';
    return this.formatAppointmentDay(date);
  });

  readonly appointmentDraftStartHourLabel = computed(
    () => this.appointmentDraft().startHour || '--:--',
  );

  readonly appointmentDraftEndHourLabel = computed(
    () => this.appointmentDraft().endHour || '--:--',
  );

  retryAppointmentAvailabilityCheck(): void {
    this.queueAppointmentAvailabilityCheck();
  }

  setAppointmentFilter(filter: AppointmentFilter | null | undefined): void {
    if (filter) this.appointmentFilter.set(filter);
  }

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
            this.refreshAppointmentSyncStatus(updated.id);
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

    const scheduleError = validateAppointmentSchedule(startDate, endDate);
    if (scheduleError) {
      this.appointmentDraftError.set(scheduleError);
      return;
    }

    if (editingId) {
      this.appointmentApi
        .update(editingId, {
          title,
          description: draft.description.trim() || undefined,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          ...(['cancelled', 'expired'].includes(editingAppointment?.status ?? '')
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
            this.refreshAppointmentSyncStatus(updated.id);
          },
          error: (error) => this.handleAppointmentSaveError(error, 'actualizar'),
        });
    } else {
      this.appointmentApi
        .create({
          clientId: this.clientId,
          title,
          description: draft.description.trim() || undefined,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (created) => {
            this.appointments.update((appts) => [this.mapApiAppointment(created), ...appts]);
            this.closeAppointmentModal();
            this.refreshAppointmentSyncStatus(created.id);
          },
          error: (error) => this.handleAppointmentSaveError(error, 'crear'),
        });
    }
  }

  updateAppointmentStatus(appointment: IClientAppointment, status: IClientAppointment['status']) {
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
          this.refreshAppointmentSyncStatus(updated.id);
        },
        error: () => {
          this.actionError.set('No se pudo actualizar el estado de la cita.');
        },
      });
  }

  async confirmAppointmentCancellation(appointment: IClientAppointment): Promise<void> {
    const alert = await this.alertCtrl.create(
      buildAppointmentCancellationAlert(appointment, () =>
        this.updateAppointmentStatus(appointment, 'cancelled'),
      ),
    );

    await alert.present();
  }

  retryAppointmentCalendarSync(appointment: IClientAppointment): void {
    if (this.retryingCalendarAppointmentId()) return;
    this.actionError.set(null);
    this.retryingCalendarAppointmentId.set(appointment.id);
    this.appointmentApi
      .retryCalendarSync(appointment.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.appointments.update((appointments) =>
            appointments.map((item) =>
              item.id === appointment.id ? this.mapApiAppointment(updated) : item,
            ),
          );
          this.retryingCalendarAppointmentId.set(null);
          this.refreshAppointmentSyncStatus(updated.id);
        },
        error: () => {
          this.retryingCalendarAppointmentId.set(null);
          this.actionError.set('No se pudo reintentar. Comprueba que Google siga vinculado.');
        },
      });
  }

  calendarSyncLabel(appointment: IClientAppointment): string {
    switch (appointment.calendarSyncStatus) {
      case 'pending':
        return 'Pendiente de sincronizar con Google';
      case 'synced':
        return appointment.status === 'cancelled'
          ? 'Eliminada de Google Calendar'
          : 'Sincronizada con Google Calendar';
      case 'failed':
        return 'Error al sincronizar con Google';
      default:
        return 'Sin sincronización con Google';
    }
  }

  calendarSyncIcon(appointment: IClientAppointment): string {
    switch (appointment.calendarSyncStatus) {
      case 'pending':
        return 'sync-outline';
      case 'synced':
        return 'cloud-done-outline';
      case 'failed':
        return 'alert-circle-outline';
      default:
        return 'logo-google';
    }
  }

  private refreshAppointmentSyncStatus(appointmentId: string): void {
    if (this.pollingCalendarAppointmentIds.has(appointmentId)) return;
    this.pollingCalendarAppointmentIds.add(appointmentId);
    timer(1_000, 1_500)
      .pipe(
        take(6),
        switchMap(() => this.appointmentApi.getAllByClient(this.clientId)),
        takeWhile(
          (appointments) =>
            appointments.some(
              (appointment) =>
                appointment.id === appointmentId && appointment.calendarSyncStatus === 'pending',
            ),
          true,
        ),
        finalize(() => this.pollingCalendarAppointmentIds.delete(appointmentId)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (appointments) =>
          this.appointments.set(
            appointments.map((appointment) => this.mapApiAppointment(appointment)),
          ),
        error: () => undefined,
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
      externalEventId: a.externalEventId,
      externalCalendarId: a.externalCalendarId,
      calendarSyncStatus: a.calendarSyncStatus ?? 'not_synced',
      calendarSyncError: a.calendarSyncError,
      calendarSyncedAt: a.calendarSyncedAt,
      scheduleConflicts: a.scheduleConflicts ?? [],
    };
  }

  private queueAppointmentAvailabilityCheck(): void {
    if (this.isEditingCompletedAppointment()) {
      this.appointmentAvailability.set({ status: 'idle' });
      return;
    }
    const { date, startHour, endHour } = this.appointmentDraft();
    if (!date || !startHour || !endHour) {
      this.appointmentAvailability.set({ status: 'idle' });
      return;
    }
    const startTime = new Date(`${date}T${startHour}`);
    const endTime = new Date(`${date}T${endHour}`);
    if (validateAppointmentSchedule(startTime, endTime)) {
      this.appointmentAvailability.set({ status: 'idle' });
      return;
    }
    this.appointmentAvailability.set({ status: 'checking' });
    this.appointmentAvailabilityRequests.next({
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      ...(this.editingAppointmentId()
        ? { excludeAppointmentId: this.editingAppointmentId()! }
        : {}),
    });
  }

  private availabilityErrorState(error: unknown): AppointmentAvailabilityViewState {
    if (
      error instanceof HttpErrorResponse &&
      error.status === 409 &&
      error.error?.code === 'APPOINTMENT_TIME_CONFLICT'
    ) {
      return availabilityStateFromResult({
        available: false,
        externalCalendarChecked: Boolean(error.error.externalCalendarChecked),
        conflicts: Array.isArray(error.error.conflicts) ? error.error.conflicts : [],
      });
    }
    if (
      error instanceof HttpErrorResponse &&
      error.error?.code === 'EXTERNAL_CALENDAR_AVAILABILITY_UNAVAILABLE'
    ) {
      return {
        status: 'error',
        message: 'No se pudo verificar Google Calendar. Intenta nuevamente antes de guardar.',
      };
    }
    return {
      status: 'error',
      message: 'No se pudo comprobar la disponibilidad. Intenta nuevamente.',
    };
  }

  private handleAppointmentSaveError(error: unknown, action: 'crear' | 'actualizar'): void {
    if (
      error instanceof HttpErrorResponse &&
      ['APPOINTMENT_TIME_CONFLICT', 'EXTERNAL_CALENDAR_AVAILABILITY_UNAVAILABLE'].includes(
        error.error?.code,
      )
    ) {
      this.appointmentAvailability.set(this.availabilityErrorState(error));
      return;
    }
    this.actionError.set(`No se pudo ${action} la cita.`);
  }

  private formatAppointmentInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatAppointmentInputHour(date: Date): string {
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${hour}:${minute}`;
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
    const start = roundUpToNextMinutes(new Date(), 15);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    return {
      title: '',
      description: '',
      date: this.formatDateLocal(start),
      startHour: this.formatHourLocal(start),
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
    const sanitized = String(
      (event as CustomEvent<{ value?: string | number | null }>).detail.value ?? '',
    )
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
        (offer) => offer.productId === productId && offer.status !== ClientProductStatus.SOLD,
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
    }).subscribe({
      next: () => {
        this.draftProductId.set('');
        this.draftProductStatus.set(ClientProductStatus.OFFERED);
        this.draftProductCustomPrice.set('');
        this.draftProductQuantity.set('1');
        this.draftProductNotes.set('');
      },
      error: () => this.productLinkError.set('No se pudo vincular el producto. Conservamos los datos para que puedas reintentar.'),
    });
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
    }).subscribe({ error: () => this.actionError.set('No se pudo actualizar el producto del cliente.') });
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
            }).subscribe({ error: () => this.actionError.set('No se pudieron guardar las notas del producto.') });
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
      header:
        offer.resolvedProductType === ProductType.PRODUCT
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
              quantity:
                offer.resolvedProductType === ProductType.PRODUCT
                  ? offer.resolvedProductQuantity
                  : null,
              updatedAt: new Date().toISOString(),
            }).subscribe({ error: () => this.actionError.set('No se pudo restaurar el precio del catálogo.') });
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
            }).subscribe({ error: () => this.actionError.set('No se pudo actualizar el precio del producto.') });
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
            this.salesCatalogStore.deleteClientProduct(offer.id).subscribe({
              error: () => this.actionError.set('No se pudo eliminar el vínculo con el producto.'),
            });
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
    this.clientApi
      .update(this.clientId, { stage: newStage })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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
            }).subscribe({
              next: () => void alert.dismiss(),
              error: () => this.actionError.set('No se pudo guardar la plantilla.'),
            });
            return false;
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
            this.messageTemplateStore.deleteTemplate(template.id).subscribe({
              error: () => this.actionError.set('No se pudo eliminar la plantilla.'),
            });
          },
        },
      ],
    });
    await alert.present();
  }

  personalizeTemplateMessage(template: IMessageTemplate): string {
    return this.renderTemplate(template).message;
  }

  getTemplateWhatsAppUrl(template: IMessageTemplate): string {
    const phone = this.client().phone.replaceAll(/\D/g, '');
    const rendered = this.renderTemplate(template);
    if (rendered.unresolvedTokens.length > 0) return '';
    return `https://wa.me/${phone}?text=${encodeURIComponent(rendered.message)}`;
  }

  unresolvedTemplateTokens(template: IMessageTemplate): readonly string[] {
    return this.renderTemplate(template).unresolvedTokens;
  }

  private renderTemplate(template: IMessageTemplate) {
    const nextAppointment = this.visibleAppointments().find((appointment) => appointment.status !== 'cancelled');
    const paymentUrl = this.payments().find((payment) => payment.checkoutUrl)?.checkoutUrl;
    return interpolateTemplate(template.messageBody, {
      name: this.client().firstName,
      date: nextAppointment
        ? nextAppointment.startAt
          ? new Date(nextAppointment.startAt).toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' })
          : nextAppointment.startTime
        : undefined,
      paymentUrl,
    });
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
    if (
      payment.status === PaymentStatus.PAID &&
      payment.sourceType === PaymentSourceType.CLIENT_PRODUCT
    ) {
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
      buildPaymentCancellationAlert(clientName, payment.amount, () =>
        this.performPaymentCancellation(payment),
      ),
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
    return {
      [PaymentStatus.PENDING]: 'Pago pendiente',
      [PaymentStatus.PAID]: 'Pagado',
      [PaymentStatus.FAILED]: 'Fallido',
      [PaymentStatus.CANCELLED]: 'Cancelado',
      [PaymentStatus.REFUNDED]: 'Reembolsado',
    }[status];
  }

  private getEventValue<T>(event: Event): T | null {
    const value = (event as CustomEvent<{ value?: T }>).detail?.value;
    return value ?? null;
  }

  private async confirmDiscard(item: 'cliente' | 'nota' | 'cita'): Promise<boolean> {
    const alert = await this.alertCtrl.create({
      header: 'Descartar cambios',
      message: `Hay cambios sin guardar en ${item === 'cliente' ? 'el cliente' : `la ${item}`}. ¿Quieres descartarlos?`,
      buttons: [
        { text: 'Seguir editando', role: 'cancel' },
        { text: 'Descartar', role: 'destructive' },
      ],
    });
    await alert.present();
    const result = await alert.onDidDismiss();
    return result.role === 'destructive';
  }

  private sanitizePriceInput(rawValue: string): string {
    const normalized = rawValue.replace(',', '.').replace(/[^\d.]/g, '');
    const [integer = '', ...decimalParts] = normalized.split('.');
    return decimalParts.length ? `${integer}.${decimalParts.join('').slice(0, 2)}` : integer;
  }

  private parseOptionalPrice(rawValue: string | number | undefined): number | undefined {
    const normalized = String(rawValue ?? '')
      .replace(',', '.')
      .trim();
    if (!normalized) return undefined;
    const value = Number(normalized);
    if (!Number.isFinite(value) || value < 0) return undefined;
    return Math.round(value * 100) / 100;
  }
}
