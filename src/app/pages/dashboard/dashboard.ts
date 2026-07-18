import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClientStage } from '../../enums/client-stage.enum';
import { IClient } from '../../interfaces/client.interface';
import { IDashboardAppointment } from '../../interfaces/dashboard-appointment.interface';
import { CLIENT_STAGE_OPTIONS } from '../../shared/client-stage.utils';
import { COMMON_ION_PAGE_IMPORTS } from '../../shared/ionic-imports';
import { AppointmentStatusLabelPipe } from '../../shared/pipes/appointment-status.pipes';
import { StageLabelPipe, StageColorPipe } from '../../shared/pipes/stage.pipes';
import { addIcons } from 'ionicons';
import {
  peopleOutline,
  calendarOutline,
  timeOutline,
  addOutline,
  settingsOutline,
  chevronForwardOutline,
  closeOutline,
  callOutline,
  pricetagOutline,
  chatbubblesOutline,
  cashOutline,
} from 'ionicons/icons';
import {
  IonAvatar,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  AlertController,
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';
import { ClientApiService } from '../../core/services/client-api.service';
import { AppointmentApiService } from '../../core/services/appointment-api.service';
import { IAppointmentApi } from '../../core/interfaces/appointment-api.interface';
import { PaymentApiService } from '../../core/services/payment-api.service';
import { PaymentStatus } from '../../enums/payment-status.enum';
import { UiState } from '../../shared/types/ui-state.type';
import { UserMenuComponent } from '../../shared/components/user-menu/user-menu';

@Component({
  selector: 'app-dashboard',
  host: { class: 'ion-page' },
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ...COMMON_ION_PAGE_IMPORTS,
    IonAvatar,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    StageLabelPipe,
    StageColorPipe,
    AppointmentStatusLabelPipe,
    UserMenuComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly clientApi = inject(ClientApiService);
  private readonly appointmentApi = inject(AppointmentApiService);
  private readonly paymentApi = inject(PaymentApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);

  readonly userName = computed(() => {
    const user = this.authService.currentUser();
    return (
      user?.companyName ??
      user?.firstName ??
      user?.email?.split('@')[0] ??
      'Tu empresa'
    );
  });
  readonly searchQuery = signal('');
  readonly stageFilter = signal<ClientStage | 'ALL'>('ALL');
  readonly isAddClientModalOpen = signal(false);
  readonly isCreatingClient = signal(false);
  readonly addClientStatusMessage = signal('');
  readonly clientDisplayLimit = signal(20);
  readonly stageOptions = signal(CLIENT_STAGE_OPTIONS);
  readonly loadState = signal<UiState>('idle');
  readonly loadError = signal<string | null>(null);
  readonly addClientForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(60)]],
    lastName: ['', [Validators.required, Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.maxLength(30)]],
    stage: [ClientStage.FIRST_CONTACT as ClientStage, [Validators.required]],
  });

  readonly stats = signal([
    { label: 'Total de clientes', value: 0, icon: 'people-outline', color: 'stat-icon--sky' },
    { label: 'Hoy', value: 0, icon: 'time-outline', color: 'stat-icon--green' },
    { label: 'Pagos Pendientes', value: 0, icon: 'cash-outline', color: 'stat-icon--amber' },
  ]);
  readonly pendingPaymentCount = computed(() => this.stats().find((stat) => stat.label === 'Pagos Pendientes')?.value ?? 0);

  readonly recentClients = signal<IClient[]>([]);
  readonly appointmentsToday = signal<IAppointmentApi[]>([]);

  readonly upcomingAppointments = computed<IDashboardAppointment[]>(() => {
    const clientsById = new Map(this.recentClients().map((client) => [client.id, client]));

    return this.appointmentsToday()
      .filter((appointment) => appointment.status === 'scheduled')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .map((appointment) => {
        const client = clientsById.get(appointment.clientId);
        const clientName = client
          ? `${client.firstName} ${client.lastName}`.trim()
          : 'Cliente sin nombre';

        return {
          id: appointment.id,
          clientName,
          initials: client?.initials ?? this.getClientInitials(clientName),
          title: appointment.title,
          time: new Date(appointment.startTime).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }),
          status: appointment.status,
        };
      });
  });

  readonly filteredClients = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const sf = this.stageFilter();
    let clients = this.recentClients();

    if (sf !== 'ALL') {
      clients = clients.filter((c) => c.stage === sf);
    }

    if (q) {
      clients = clients.filter(
        (c) =>
          c.firstName.toLowerCase().includes(q) ||
          c.lastName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q),
      );
    }

    return clients;
  });

  readonly pagedClients = computed(() =>
    this.filteredClients().slice(0, this.clientDisplayLimit()),
  );

  constructor() {
    addIcons({
      peopleOutline,
      calendarOutline,
      timeOutline,
      addOutline,
      settingsOutline,
      chevronForwardOutline,
      closeOutline,
      callOutline,
      pricetagOutline,
      chatbubblesOutline,
      cashOutline,
    });
    const query = this.route.snapshot.queryParamMap;
    this.searchQuery.set(query.get('q') ?? '');
    const stage = query.get('stage');
    if (stage === 'ALL' || CLIENT_STAGE_OPTIONS.some((option) => option.value === stage)) {
      this.stageFilter.set((stage ?? 'ALL') as ClientStage | 'ALL');
    }
  }

  ionViewWillEnter(): void {
    this.loadState.set('loading');
    this.loadError.set(null);
    this.clientApi.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (clients) => {
        this.recentClients.set(clients);
        this.stats.update((s) =>
          s.map((stat) =>
            stat.label === 'Total de clientes'
              ? { ...stat, value: clients.length }
              : stat,
          ),
        );
        this.loadState.set('success');
      },
      error: () => {
        this.loadState.set('error');
        this.loadError.set('No se pudieron cargar los clientes. Recarga la página para intentarlo nuevamente.');
      },
    });

    this.appointmentApi.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (appointments) => {
        const today = new Date();
        const todayStr = today.toDateString();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const todayAppts = appointments.filter((a) =>
          new Date(a.startTime).toDateString() === todayStr,
        );
        this.stats.update((s) =>
          s.map((stat) => {
            if (stat.label === 'Hoy') return { ...stat, value: todayAppts.length };
            return stat;
          }),
        );

        this.appointmentsToday.set(todayAppts);
      },
    });

    this.paymentApi.list({ status: PaymentStatus.PENDING, page: 1, limit: 1 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ total }) => this.stats.update((stats) => stats.map((stat) =>
          stat.label === 'Pagos Pendientes' ? { ...stat, value: total } : stat,
        )),
        error: () => this.loadError.set('No se pudo cargar el resumen de pagos.'),
      });
  }

  private getClientInitials(clientName: string): string {
    return clientName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'CL';
  }

  onSearch(event: CustomEvent) {
    this.searchQuery.set(event.detail.value ?? '');
    this.clientDisplayLimit.set(20);
    this.syncFiltersToUrl();
  }

  onStageFilterChange(event: CustomEvent) {
    const stage = this.getEventValue<ClientStage | 'ALL'>(event);
    if (!stage) return;
    this.stageFilter.set(stage);
    this.clientDisplayLimit.set(20);
    this.syncFiltersToUrl();
  }

  clearClientFilters(): void {
    this.searchQuery.set('');
    this.stageFilter.set('ALL');
    this.clientDisplayLimit.set(20);
    this.syncFiltersToUrl();
  }

  loadMoreClients(event: Event): void {
    this.clientDisplayLimit.update((n) => n + 20);
    const target = event.target as { complete?: () => void } | null;
    target?.complete?.();
  }

  openAddClientModal() {
    this.resetAddClientForm();
    this.addClientStatusMessage.set('');
    this.isAddClientModalOpen.set(true);
  }

  closeAddClientModal(resetForm = true) {
    this.isAddClientModalOpen.set(false);
    if (resetForm) {
      this.resetAddClientForm();
    }
  }

  readonly canDismissAddClient = async (): Promise<boolean> => {
    if (this.isCreatingClient()) return false;
    if (!this.addClientForm.dirty) return true;

    const alert = await this.alertCtrl.create({
      header: 'Descartar cliente',
      message: 'Hay datos sin guardar. ¿Quieres descartarlos?',
      buttons: [
        { text: 'Seguir editando', role: 'cancel' },
        { text: 'Descartar', role: 'destructive' },
      ],
    });
    await alert.present();
    const result = await alert.onDidDismiss();
    return result.role === 'destructive';
  };

  async requestCloseAddClientModal(): Promise<void> {
    if (await this.canDismissAddClient()) this.closeAddClientModal();
  }

  onAddClientModalDidDismiss(): void {
    this.closeAddClientModal();
  }

  createClient() {
    if (this.isCreatingClient()) return;

    if (this.addClientForm.invalid) {
      this.addClientForm.markAllAsTouched();
      this.addClientStatusMessage.set('Revisa los campos marcados e intenta nuevamente.');
      this.focusFirstInvalidClientField();
      return;
    }

    const { firstName, lastName, email, phone, stage } = this.addClientForm.getRawValue();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedFirstName || !trimmedLastName || !trimmedPhone) {
      if (!trimmedFirstName) this.addClientForm.controls.firstName.setErrors({ required: true });
      if (!trimmedLastName) this.addClientForm.controls.lastName.setErrors({ required: true });
      if (!trimmedPhone) this.addClientForm.controls.phone.setErrors({ required: true });
      this.addClientForm.markAllAsTouched();
      this.addClientStatusMessage.set('Revisa los campos marcados e intenta nuevamente.');
      this.focusFirstInvalidClientField();
      return;
    }

    this.isCreatingClient.set(true);
    this.addClientStatusMessage.set('Creando cliente…');
    this.clientApi
      .create({
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        email: trimmedEmail || undefined,
        phoneNumber: trimmedPhone,
        stage,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ client }) => {
          this.recentClients.update((clients) => [client, ...clients]);
          this.stats.update((stats) =>
            stats.map((stat) =>
              stat.label === 'Total de clientes'
                ? { ...stat, value: stat.value + 1 }
                : stat,
            ),
          );
          this.isCreatingClient.set(false);
          this.addClientStatusMessage.set('Cliente agregado correctamente.');
          this.closeAddClientModal();
        },
        error: () => {
          this.isCreatingClient.set(false);
          this.addClientStatusMessage.set('No se pudo agregar el cliente. Revisa los datos e intenta nuevamente.');
        },
      });
  }

  resetAddClientForm() {
    this.addClientForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      stage: ClientStage.FIRST_CONTACT,
    });
    this.addClientForm.markAsPristine();
    this.addClientForm.markAsUntouched();
  }

  private focusFirstInvalidClientField(): void {
    const fieldIds = [
      ['firstName', 'add-client-first-name'],
      ['lastName', 'add-client-last-name'],
      ['email', 'add-client-email'],
      ['phone', 'add-client-phone'],
    ] as const;
    const invalidField = fieldIds.find(([controlName]) => this.addClientForm.controls[controlName].invalid);
    if (!invalidField) return;

    setTimeout(() => {
      const input = document.getElementById(invalidField[1]) as (HTMLElement & { setFocus?: () => Promise<void> }) | null;
      void input?.setFocus?.();
    });
  }

  private getEventValue<T>(event: Event): T | null {
    const value = (event as CustomEvent<{ value?: T }>).detail?.value;
    return value ?? null;
  }

  private syncFiltersToUrl(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: this.searchQuery() || null, stage: this.stageFilter() === 'ALL' ? null : this.stageFilter() },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

}
