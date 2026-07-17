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
import { IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  calendarOutline,
  chevronBackOutline,
  chevronForwardOutline,
  logoGoogle,
  refreshOutline,
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
    UserMenuComponent,
    AppointmentStatusColorPipe,
    AppointmentStatusLabelPipe,
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
  readonly showCancelled = signal(false);
  readonly loadState = signal<UiState>('idle');
  readonly loadError = signal<string | null>(null);

  readonly visibleAppointments = computed<AgendaAppointment[]>(() => {
    const clients = new Map(this.clients().map((client) => [client.id, client]));
    return this.appointments()
      .filter((appointment) => this.showCancelled() || appointment.status !== 'cancelled')
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
      calendarOutline,
      chevronBackOutline,
      chevronForwardOutline,
      logoGoogle,
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

  toggleCancelled(): void {
    this.showCancelled.update((visible) => !visible);
  }

  selectDay(date: Date): void {
    this.selectedDate.set(normalizeCalendarDate(date));
    this.view.set('day');
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
