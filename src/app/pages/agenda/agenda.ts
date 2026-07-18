import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { IonBackButton, IonSelect, IonSelectOption, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  addOutline,
  calendarOutline,
  chevronBackOutline,
  chevronForwardOutline,
  logoGoogle,
  refreshOutline,
  optionsOutline,
  timeOutline,
} from 'ionicons/icons';
import { AppointmentApiService } from '../../core/services/appointment-api.service';
import { ClientApiService } from '../../core/services/client-api.service';
import { IAppointmentApi } from '../../core/interfaces/appointment-api.interface';
import { IClient } from '../../interfaces/client.interface';
import { COMMON_ION_PAGE_IMPORTS } from '../../shared/ionic-imports';
import { UserMenuComponent } from '../../shared/components/user-menu/user-menu';
import {
  AppointmentStatusColorPipe,
  AppointmentStatusLabelPipe,
} from '../../shared/pipes/appointment-status.pipes';
import { UiState } from '../../shared/types/ui-state.type';
import {
  AgendaView,
  appointmentsOnDay,
  calendarMonthGrid,
  calendarWeek,
  isSameCalendarDay,
  moveCalendarPeriod,
  normalizeCalendarDate,
} from './agenda-date.utils';
import {
  AGENDA_STATUS_FILTERS,
  AgendaStatusFilter,
  filterAgendaAppointments,
} from './agenda-filter.utils';
import { AppointmentEditorComponent } from './appointment-editor/appointment-editor.component';

interface AgendaAppointment extends IAppointmentApi {
  readonly clientName: string;
  readonly clientInitials: string;
}

interface AgendaDay {
  readonly date: Date;
  readonly appointments: AgendaAppointment[];
  readonly isToday: boolean;
  readonly isCurrentMonth: boolean;
}

@Component({
  selector: 'app-agenda',
  host: { class: 'ion-page' },
  imports: [
    RouterLink,
    ...COMMON_ION_PAGE_IMPORTS,
    IonSpinner,
    IonBackButton,
    IonSelect,
    IonSelectOption,
    UserMenuComponent,
    AppointmentStatusColorPipe,
    AppointmentStatusLabelPipe,
    AppointmentEditorComponent,
  ],
  templateUrl: './agenda.html',
  styleUrl: './agenda.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgendaPage {
  private readonly appointmentApi = inject(AppointmentApiService);
  private readonly clientApi = inject(ClientApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly view = signal<AgendaView>('week');
  readonly selectedDate = signal(normalizeCalendarDate(new Date()));
  readonly appointments = signal<IAppointmentApi[]>([]);
  readonly clients = signal<IClient[]>([]);
  readonly statusFilter = signal<AgendaStatusFilter>('active');
  readonly clientFilter = signal('all');
  readonly loadState = signal<UiState>('idle');
  readonly loadError = signal<string | null>(null);
  readonly actionNotice = signal<string | null>(null);
  readonly isEditorOpen = signal(false);
  readonly editingAppointment = signal<IAppointmentApi | null>(null);
  readonly editorInitialDate = signal(normalizeCalendarDate(new Date()));
  readonly statusFilters = AGENDA_STATUS_FILTERS;

  readonly sortedClients = computed(() =>
    [...this.clients()].sort((first, second) =>
      `${first.firstName} ${first.lastName}`.localeCompare(
        `${second.firstName} ${second.lastName}`,
      ),
    ),
  );

  readonly visibleAppointments = computed<AgendaAppointment[]>(() => {
    const clients = new Map(this.clients().map((client) => [client.id, client]));
    return filterAgendaAppointments(this.appointments(), this.statusFilter(), this.clientFilter())
      .map((appointment) => {
        const client = clients.get(appointment.clientId);
        const clientName = client
          ? `${client.firstName} ${client.lastName}`.trim()
          : 'Cliente sin nombre';
        return {
          ...appointment,
          clientName,
          clientInitials: client?.initials || this.initials(clientName),
        };
      })
      .sort(
        (first, second) =>
          new Date(first.startTime).getTime() - new Date(second.startTime).getTime(),
      );
  });

  readonly weekDays = computed<AgendaDay[]>(() =>
    calendarWeek(this.selectedDate()).map((date) => this.toAgendaDay(date)),
  );

  readonly monthDays = computed<AgendaDay[]>(() => {
    const selected = this.selectedDate();
    return calendarMonthGrid(selected).map((date) => this.toAgendaDay(date, selected.getMonth()));
  });

  readonly selectedDay = computed(() => this.toAgendaDay(this.selectedDate()));

  readonly mobileDays = computed<AgendaDay[]>(() => {
    const days =
      this.view() === 'day'
        ? [this.selectedDay()]
        : this.view() === 'week'
          ? this.weekDays()
          : this.monthDays().filter((day) => day.isCurrentMonth);
    return days.filter((day) => day.appointments.length > 0);
  });

  readonly rangeLabel = computed(() => {
    const selected = this.selectedDate();
    if (this.view() === 'day') {
      return new Intl.DateTimeFormat('es-PE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(selected);
    }
    if (this.view() === 'month') {
      return new Intl.DateTimeFormat('es-PE', {
        month: 'long',
        year: 'numeric',
      }).format(selected);
    }
    const days = calendarWeek(selected);
    const start = days[0];
    const end = days[6];
    const startLabel = new Intl.DateTimeFormat('es-PE', {
      day: 'numeric',
      month: start.getMonth() === end.getMonth() ? undefined : 'short',
    }).format(start);
    const endLabel = new Intl.DateTimeFormat('es-PE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(end);
    return `${startLabel} – ${endLabel}`;
  });

  readonly visibleCount = computed(() => {
    if (this.view() === 'day') return this.selectedDay().appointments.length;
    const days =
      this.view() === 'week'
        ? this.weekDays()
        : this.monthDays().filter((day) => day.isCurrentMonth);
    return days.reduce((total, day) => total + day.appointments.length, 0);
  });

  readonly views: readonly { value: AgendaView; label: string }[] = [
    { value: 'day', label: 'Día' },
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mes' },
  ];

  constructor() {
    addIcons({
      alertCircleOutline,
      addOutline,
      calendarOutline,
      chevronBackOutline,
      chevronForwardOutline,
      logoGoogle,
      optionsOutline,
      refreshOutline,
      timeOutline,
    });
  }

  ionViewWillEnter(): void {
    this.load();
  }

  load(): void {
    this.loadState.set('loading');
    this.loadError.set(null);
    forkJoin({
      appointments: this.appointmentApi.getAll(),
      clients: this.clientApi.getAll(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ appointments, clients }) => {
          this.appointments.set(appointments);
          this.clients.set(clients);
          this.loadState.set('success');
        },
        error: () => {
          this.loadState.set('error');
          this.loadError.set(
            'No se pudo cargar la agenda. Comprueba la conexión e inténtalo otra vez.',
          );
        },
      });
  }

  selectView(view: AgendaView): void {
    this.view.set(view);
  }

  move(direction: -1 | 1): void {
    this.selectedDate.update((date) => moveCalendarPeriod(date, this.view(), direction));
  }

  goToToday(): void {
    this.selectedDate.set(normalizeCalendarDate(new Date()));
  }

  setStatusFilter(event: Event): void {
    const value = this.eventValue<AgendaStatusFilter>(event);
    if (value) this.statusFilter.set(value);
  }

  setClientFilter(event: Event): void {
    const value = this.eventValue<string>(event);
    if (value) this.clientFilter.set(value);
  }

  selectDay(date: Date): void {
    this.selectedDate.set(normalizeCalendarDate(date));
    this.view.set('day');
  }

  openCreate(date = this.selectedDate()): void {
    const normalized = normalizeCalendarDate(date);
    const today = normalizeCalendarDate(new Date());
    this.editorInitialDate.set(normalized.getTime() < today.getTime() ? today : normalized);
    this.editingAppointment.set(null);
    this.actionNotice.set(null);
    this.isEditorOpen.set(true);
  }

  openEdit(appointment: IAppointmentApi): void {
    this.editingAppointment.set(appointment);
    this.editorInitialDate.set(normalizeCalendarDate(new Date(appointment.startTime)));
    this.actionNotice.set(null);
    this.isEditorOpen.set(true);
  }

  closeEditor(): void {
    this.isEditorOpen.set(false);
    this.editingAppointment.set(null);
  }

  handleAppointmentSaved(appointment: IAppointmentApi): void {
    const wasEditing = this.editingAppointment() !== null;
    this.upsertAppointment(appointment);
    this.selectedDate.set(normalizeCalendarDate(new Date(appointment.startTime)));
    this.actionNotice.set(wasEditing ? 'Cita actualizada.' : 'Cita creada y añadida a la Agenda.');
    this.closeEditor();
  }

  handleAppointmentCancelled(appointment: IAppointmentApi): void {
    this.upsertAppointment(appointment);
    this.actionNotice.set(
      appointment.externalEventId
        ? 'Cita cancelada. También se actualizará el calendario vinculado.'
        : 'Cita cancelada.',
    );
    this.closeEditor();
  }

  canCreateOn(date: Date): boolean {
    return normalizeCalendarDate(date).getTime() >= normalizeCalendarDate(new Date()).getTime();
  }

  dayLabel(date: Date): string {
    return new Intl.DateTimeFormat('es-PE', { weekday: 'short' }).format(date);
  }

  fullDayLabel(date: Date): string {
    return new Intl.DateTimeFormat('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(date);
  }

  appointmentTime(appointment: IAppointmentApi): string {
    const formatter = new Intl.DateTimeFormat('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${formatter.format(new Date(appointment.startTime))}–${formatter.format(
      new Date(appointment.endTime),
    )}`;
  }

  hasConflict(appointment: IAppointmentApi): boolean {
    return Boolean(appointment.scheduleConflicts?.length);
  }

  canOpenExternalCalendar(appointment: IAppointmentApi): boolean {
    return Boolean(appointment.externalEventId || appointment.scheduleConflicts?.length);
  }

  private upsertAppointment(updated: IAppointmentApi): void {
    this.appointments.update((appointments) => {
      const exists = appointments.some((appointment) => appointment.id === updated.id);
      return exists
        ? appointments.map((appointment) => (appointment.id === updated.id ? updated : appointment))
        : [...appointments, updated];
    });
  }

  private eventValue<T>(event: Event): T | null {
    return (event as CustomEvent<{ value?: T }>).detail?.value ?? null;
  }

  private toAgendaDay(date: Date, selectedMonth = date.getMonth()): AgendaDay {
    return {
      date,
      appointments: appointmentsOnDay(this.visibleAppointments(), date),
      isToday: isSameCalendarDay(date, new Date()),
      isCurrentMonth: date.getMonth() === selectedMonth,
    };
  }

  private initials(name: string): string {
    return (
      name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || 'CL'
    );
  }
}
