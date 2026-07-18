import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlertController } from '@ionic/angular';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonDatetime,
  IonDatetimeButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, closeOutline, timeOutline, trashOutline } from 'ionicons/icons';
import { Subject, catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { IAppointmentApi } from '../../../core/interfaces/appointment-api.interface';
import { ICheckAppointmentAvailabilityPayload } from '../../../core/interfaces/appointment-availability-api.interface';
import { AppointmentApiService } from '../../../core/services/appointment-api.service';
import { IClient } from '../../../interfaces/client.interface';
import {
  AppointmentAvailabilityViewState,
  appointmentAvailabilityMessage,
  availabilityStateFromResult,
} from '../../client-detail/appointment-availability.utils';
import { buildAppointmentCancellationAlert } from '../../client-detail/appointment-cancellation.utils';
import {
  roundUpToNextMinutes,
  validateAppointmentSchedule,
} from '../../client-detail/appointment-schedule.utils';

interface AppointmentEditorDraft {
  readonly clientId: string;
  readonly title: string;
  readonly description: string;
  readonly date: string;
  readonly startHour: string;
  readonly endHour: string;
}

@Component({
  selector: 'app-appointment-editor',
  imports: [
    IonButton,
    IonButtons,
    IonCard,
    IonCardContent,
    IonDatetime,
    IonDatetimeButton,
    IonHeader,
    IonIcon,
    IonInput,
    IonModal,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonTextarea,
    IonTitle,
    IonToolbar,
  ],
  templateUrl: './appointment-editor.component.html',
  styleUrl: './appointment-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppointmentEditorComponent implements OnInit {
  private readonly appointmentApi = inject(AppointmentApiService);
  private readonly alertController = inject(AlertController);
  private readonly destroyRef = inject(DestroyRef);
  private readonly availabilityRequests = new Subject<ICheckAppointmentAvailabilityPayload>();

  readonly clients = input.required<readonly IClient[]>();
  readonly appointment = input<IAppointmentApi | null>(null);
  readonly initialDate = input.required<Date>();

  readonly closed = output<void>();
  readonly saved = output<IAppointmentApi>();
  readonly cancelled = output<IAppointmentApi>();

  readonly draft = signal<AppointmentEditorDraft>(this.emptyDraft());
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly availability = signal<AppointmentAvailabilityViewState>({ status: 'idle' });
  readonly minimumDate = this.formatDate(new Date());
  private readonly initialDraft = signal<AppointmentEditorDraft | null>(null);

  readonly isEditing = computed(() => this.appointment() !== null);
  readonly isCompleted = computed(() => this.appointment()?.status === 'completed');
  readonly canCancel = computed(() => {
    const status = this.appointment()?.status;
    return status === 'scheduled' || status === 'expired';
  });
  readonly scheduleError = computed(() => {
    if (this.isCompleted()) return null;
    const { date, startHour, endHour } = this.draft();
    if (!date || !startHour || !endHour) return null;
    return validateAppointmentSchedule(
      new Date(`${date}T${startHour}`),
      new Date(`${date}T${endHour}`),
    );
  });
  readonly availabilityMessage = computed(() =>
    appointmentAvailabilityMessage(this.availability()),
  );
  readonly dateLabel = computed(() => {
    const value = this.draft().date;
    if (!value) return 'Seleccionar fecha';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return 'Seleccionar fecha';
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  });
  readonly startHourLabel = computed(() => this.draft().startHour || '--:--');
  readonly endHourLabel = computed(() => this.draft().endHour || '--:--');
  readonly saveDisabled = computed(() => {
    if (this.saving()) return true;
    if (this.isCompleted()) return false;
    if (this.scheduleError()) return true;
    return ['checking', 'conflict', 'error'].includes(this.availability().status);
  });

  constructor() {
    addIcons({
      checkmarkCircleOutline,
      closeOutline,
      timeOutline,
      trashOutline,
    });

    this.availabilityRequests
      .pipe(
        debounceTime(300),
        distinctUntilChanged(
          (previous, current) => JSON.stringify(previous) === JSON.stringify(current),
        ),
        switchMap((request) =>
          this.appointmentApi.checkAvailability(request).pipe(
            map((result) => availabilityStateFromResult(result)),
            catchError((requestError: unknown) => of(this.availabilityErrorState(requestError))),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => this.availability.set(state));
  }

  ngOnInit(): void {
    const initialDraft = this.createInitialDraft();
    this.draft.set(initialDraft);
    this.initialDraft.set(initialDraft);
    this.queueAvailabilityCheck();
  }

  readonly canDismiss = async (): Promise<boolean> => {
    if (this.saving()) return false;
    if (JSON.stringify(this.draft()) === JSON.stringify(this.initialDraft())) return true;
    const alert = await this.alertController.create({
      header: 'Descartar cambios',
      message: 'La cita tiene cambios sin guardar. ¿Quieres descartarlos?',
      buttons: [
        { text: 'Seguir editando', role: 'cancel' },
        { text: 'Descartar', role: 'destructive' },
      ],
    });
    await alert.present();
    const result = await alert.onDidDismiss();
    return result.role === 'destructive';
  };

  async requestClose(): Promise<void> {
    if (await this.canDismiss()) this.closed.emit();
  }

  onTextChange(field: 'title' | 'description', event: Event): void {
    this.updateDraft(field, this.eventValue(event));
  }

  onClientChange(event: Event): void {
    this.updateDraft('clientId', this.eventValue(event));
  }

  onScheduleChange(field: 'date' | 'startHour' | 'endHour', event: Event): void {
    const value = (event as CustomEvent<{ value?: string | string[] | null }>).detail?.value;
    const parsedValue = Array.isArray(value) ? value[0] : value;
    let nextValue = '';

    if (typeof parsedValue === 'string') {
      nextValue =
        field === 'date'
          ? this.normalizeDateValue(parsedValue)
          : this.normalizeTimeValue(parsedValue);
    }

    this.updateDraft(field, nextValue);
    this.queueAvailabilityCheck();
  }

  retryAvailabilityCheck(): void {
    this.queueAvailabilityCheck();
  }

  save(): void {
    if (this.saving()) return;
    this.error.set(null);
    const draft = this.draft();
    const current = this.appointment();

    if (this.isCompleted() && current) {
      this.persistUpdate(current.id, { description: draft.description.trim() });
      return;
    }

    const title = draft.title.trim();
    if (!draft.clientId || !title || !draft.date || !draft.startHour || !draft.endHour) {
      this.error.set('Selecciona un cliente y completa título, fecha y horas.');
      return;
    }

    const startTime = new Date(`${draft.date}T${draft.startHour}`);
    const endTime = new Date(`${draft.date}T${draft.endHour}`);
    const scheduleError = validateAppointmentSchedule(startTime, endTime);
    if (scheduleError) {
      this.error.set(scheduleError);
      return;
    }

    this.saving.set(true);
    if (current) {
      this.appointmentApi
        .update(current.id, {
          title,
          description: draft.description.trim() || undefined,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          ...(['cancelled', 'expired'].includes(current.status)
            ? { status: 'scheduled' as const }
            : {}),
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (updated) => this.finishSave(updated),
          error: (saveError) => this.handleSaveError(saveError, 'actualizar'),
        });
      return;
    }

    this.appointmentApi
      .create({
        clientId: draft.clientId,
        title,
        description: draft.description.trim() || undefined,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => this.finishSave(created),
        error: (saveError) => this.handleSaveError(saveError, 'crear'),
      });
  }

  async confirmCancellation(): Promise<void> {
    const current = this.appointment();
    if (!current || this.saving()) return;
    const alert = await this.alertController.create(
      buildAppointmentCancellationAlert(current, () => this.cancelAppointment(current)),
    );
    await alert.present();
  }

  private persistUpdate(id: string, payload: { description: string }): void {
    this.saving.set(true);
    this.appointmentApi
      .update(id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => this.finishSave(updated),
        error: () => {
          this.saving.set(false);
          this.error.set('No se pudo actualizar la descripción de la cita.');
        },
      });
  }

  private cancelAppointment(current: IAppointmentApi): void {
    this.saving.set(true);
    this.appointmentApi
      .update(current.id, { status: 'cancelled' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.cancelled.emit(updated);
        },
        error: () => {
          this.saving.set(false);
          this.error.set('No se pudo cancelar la cita. Intenta nuevamente.');
        },
      });
  }

  private finishSave(appointment: IAppointmentApi): void {
    this.saving.set(false);
    this.saved.emit(appointment);
  }

  private handleSaveError(saveError: unknown, action: 'crear' | 'actualizar'): void {
    this.saving.set(false);
    if (
      saveError instanceof HttpErrorResponse &&
      ['APPOINTMENT_TIME_CONFLICT', 'EXTERNAL_CALENDAR_AVAILABILITY_UNAVAILABLE'].includes(
        saveError.error?.code,
      )
    ) {
      this.availability.set(this.availabilityErrorState(saveError));
      return;
    }
    this.error.set(`No se pudo ${action} la cita.`);
  }

  private queueAvailabilityCheck(): void {
    if (this.isCompleted()) {
      this.availability.set({ status: 'idle' });
      return;
    }
    const { date, startHour, endHour } = this.draft();
    if (!date || !startHour || !endHour) {
      this.availability.set({ status: 'idle' });
      return;
    }
    const startTime = new Date(`${date}T${startHour}`);
    const endTime = new Date(`${date}T${endHour}`);
    if (validateAppointmentSchedule(startTime, endTime)) {
      this.availability.set({ status: 'idle' });
      return;
    }
    this.availability.set({ status: 'checking' });
    this.availabilityRequests.next({
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      ...(this.appointment()?.id ? { excludeAppointmentId: this.appointment()!.id } : {}),
    });
  }

  private availabilityErrorState(requestError: unknown): AppointmentAvailabilityViewState {
    if (
      requestError instanceof HttpErrorResponse &&
      requestError.status === 409 &&
      requestError.error?.code === 'APPOINTMENT_TIME_CONFLICT'
    ) {
      return availabilityStateFromResult({
        available: false,
        externalCalendarChecked: Boolean(requestError.error.externalCalendarChecked),
        conflicts: Array.isArray(requestError.error.conflicts) ? requestError.error.conflicts : [],
      });
    }
    if (
      requestError instanceof HttpErrorResponse &&
      requestError.error?.code === 'EXTERNAL_CALENDAR_AVAILABILITY_UNAVAILABLE'
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

  private createInitialDraft(): AppointmentEditorDraft {
    const current = this.appointment();
    if (current) {
      const start = new Date(current.startTime);
      const end = new Date(current.endTime);
      return {
        clientId: current.clientId,
        title: current.title,
        description: current.description ?? '',
        date: this.formatDate(start),
        startHour: this.formatHour(start),
        endHour: this.formatHour(end),
      };
    }

    const now = new Date();
    const selected = new Date(this.initialDate());
    selected.setHours(0, 0, 0, 0);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const isToday = selected.getTime() === today.getTime();
    const start = isToday ? roundUpToNextMinutes(now, 15) : new Date(selected.setHours(9, 0, 0, 0));
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    return {
      clientId: '',
      title: '',
      description: '',
      date: this.formatDate(start),
      startHour: this.formatHour(start),
      endHour: this.formatHour(end),
    };
  }

  private emptyDraft(): AppointmentEditorDraft {
    return { clientId: '', title: '', description: '', date: '', startHour: '', endHour: '' };
  }

  private updateDraft<K extends keyof AppointmentEditorDraft>(
    field: K,
    value: AppointmentEditorDraft[K],
  ): void {
    this.draft.update((current) => ({ ...current, [field]: value }));
    this.error.set(null);
  }

  private eventValue(event: Event): string {
    const customValue = (event as CustomEvent<{ value?: string | null }>).detail?.value;
    if (customValue !== undefined && customValue !== null) return customValue;
    return (event.target as HTMLInputElement | HTMLTextAreaElement).value ?? '';
  }

  private normalizeDateValue(raw: string): string {
    return raw.length >= 10 ? raw.slice(0, 10) : raw;
  }

  private normalizeTimeValue(raw: string): string {
    const dateTimeMatch = /T(\d{2}:\d{2})/.exec(raw);
    if (dateTimeMatch) return dateTimeMatch[1];

    const plainMatch = /^(\d{2}:\d{2})/.exec(raw);
    return plainMatch ? plainMatch[1] : raw;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatHour(date: Date): string {
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${hour}:${minute}`;
  }
}
