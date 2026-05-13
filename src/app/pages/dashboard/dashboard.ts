import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
  notificationsOutline,
  chevronForwardOutline,
  closeOutline,
  callOutline,
  pricetagOutline,
  chatbubblesOutline,
  cashOutline,
} from 'ionicons/icons';
import {
  IonAvatar,
  IonFab,
  IonFabButton,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';
import { ClientApiService } from '../../core/services/client-api.service';
import { AppointmentApiService } from '../../core/services/appointment-api.service';
import { IAppointmentApi } from '../../core/interfaces/appointment-api.interface';

@Component({
  selector: 'app-dashboard',
  host: { class: 'ion-page' },
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ...COMMON_ION_PAGE_IMPORTS,
    IonAvatar,
    IonFab,
    IonFabButton,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    StageLabelPipe,
    StageColorPipe,
    AppointmentStatusLabelPipe,
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
  private readonly destroyRef = inject(DestroyRef);

  readonly userName = computed(() => {
    const user = this.authService.currentUser();
    return user?.firstName ?? user?.email?.split('@')[0] ?? 'Usuario';
  });
  readonly searchQuery = signal('');
  readonly stageFilter = signal<ClientStage | 'ALL'>('ALL');
  readonly showAllAppointments = signal(false);
  readonly isAddClientModalOpen = signal(false);
  readonly isCreatingClient = signal(false);
  readonly clientDisplayLimit = signal(20);
  readonly stageOptions = signal(CLIENT_STAGE_OPTIONS);
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

  readonly recentClients = signal<IClient[]>([]);
  readonly appointmentsToday = signal<IAppointmentApi[]>([]);

  readonly upcomingAppointments = computed<IDashboardAppointment[]>(() => {
    const clientsById = new Map(this.recentClients().map((client) => [client.id, client]));

    return this.appointmentsToday()
      .filter((appointment) => appointment.status === 'scheduled')
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
      notificationsOutline,
      chevronForwardOutline,
      closeOutline,
      callOutline,
      pricetagOutline,
      chatbubblesOutline,
      cashOutline,
    });
  }

  ionViewWillEnter(): void {
    const userId = this.authService.currentUser()?.userId;
    if (!userId) return;

    this.clientApi.getAllByUser(userId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (clients) => {
        this.recentClients.set(clients);
        this.stats.update((s) =>
          s.map((stat) =>
            stat.label === 'Total de clientes'
              ? { ...stat, value: clients.length }
              : stat,
          ),
        );
      },
    });

    this.appointmentApi.getAllByUser(userId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
        const pendingPaymentsAppts = appointments.filter((a) => a.status === 'pending_payment');

        this.stats.update((s) =>
          s.map((stat) => {
            if (stat.label === 'Hoy') return { ...stat, value: todayAppts.length };
            if (stat.label === 'Pagos Pendientes') return { ...stat, value: pendingPaymentsAppts.length };
            return stat;
          }),
        );

        this.appointmentsToday.set(todayAppts);
      },
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
  }

  onStageFilterChange(event: CustomEvent) {
    const stage = this.getEventValue<ClientStage | 'ALL'>(event);
    if (!stage) return;
    this.stageFilter.set(stage);
    this.clientDisplayLimit.set(20);
  }

  loadMoreClients(event: Event): void {
    this.clientDisplayLimit.update((n) => n + 20);
    const target = event.target as { complete?: () => void } | null;
    target?.complete?.();
  }

  toggleAppointmentsView() {
    this.showAllAppointments.update((current) => !current);
  }

  openAddClientModal() {
    this.resetAddClientForm();
    this.isAddClientModalOpen.set(true);
  }

  closeAddClientModal(resetForm = true) {
    this.isAddClientModalOpen.set(false);
    if (resetForm) {
      this.resetAddClientForm();
    }
  }

  createClient() {
    if (this.addClientForm.invalid) {
      this.addClientForm.markAllAsTouched();
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
      return;
    }

    const userId = this.authService.currentUser()?.userId;
    if (!userId) return;

    this.isCreatingClient.set(true);
    this.clientApi
      .create({
        userId,
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
          this.closeAddClientModal();
        },
        error: () => {
          this.isCreatingClient.set(false);
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

  private getEventValue<T>(event: Event): T | null {
    const value = (event as CustomEvent<{ value?: T }>).detail?.value;
    return value ?? null;
  }

}
