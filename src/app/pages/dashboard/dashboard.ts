import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClientStage } from '../../enums/client-stage.enum';
import { IClient } from '../../interfaces/client.interface';
import { IDashboardAppointment } from '../../interfaces/dashboard-appointment.interface';
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
} from 'ionicons/icons';
import {
  IonAvatar,
  IonSearchbar,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-dashboard',
  host: { class: 'ion-page' },
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ...COMMON_ION_PAGE_IMPORTS,
    IonAvatar,
    IonSearchbar,
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
  private readonly clientAvatarColors = [
    'avatar--sky',
    'avatar--green',
    'avatar--indigo',
    'avatar--cyan',
    'avatar--mint',
  ] as const;

  readonly userName = signal('Alex');
  readonly searchQuery = signal('');
  readonly showAllAppointments = signal(false);
  readonly isAddClientModalOpen = signal(false);
  readonly addClientForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(60)]],
    lastName: ['', [Validators.required, Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.maxLength(30)]],
  });

  readonly stats = signal([
    { label: 'Total de clientes', value: 24, icon: 'people-outline', color: 'stat-icon--sky' },
    { label: 'Hoy', value: 3, icon: 'time-outline', color: 'stat-icon--green' },
    { label: 'Esta semana', value: 8, icon: 'calendar-outline', color: 'stat-icon--indigo' },
  ]);

  readonly upcomingAppointments = signal<IDashboardAppointment[]>([
    { id: '1', clientName: 'María García', initials: 'MG', title: 'Consulta inicial', time: '10:00', status: 'scheduled' },
    { id: '2', clientName: 'Carlos López', initials: 'CL', title: 'Sesión de seguimiento', time: '14:30', status: 'scheduled' },
    { id: '3', clientName: 'Ana Martínez', initials: 'AM', title: 'Reunión con nuevo cliente', time: '16:00', status: 'scheduled' },
  ]);

  readonly recentClients = signal<IClient[]>([
    { id: '1', firstName: 'María',  lastName: 'García',    email: 'maria@example.com',  phone: '+34 612 345 678', initials: 'MG', color: 'avatar--sky',    stage: ClientStage.FOLLOW_UP },
    { id: '2', firstName: 'Carlos', lastName: 'López',     email: 'carlos@example.com', phone: '+34 698 765 432', initials: 'CL', color: 'avatar--green',  stage: ClientStage.FIRST_CONTACT },
    { id: '3', firstName: 'Ana',    lastName: 'Martínez',  email: 'ana@example.com',    phone: '+34 677 123 456', initials: 'AM', color: 'avatar--indigo', stage: ClientStage.CLOSED_SALE },
    { id: '4', firstName: 'Pedro',  lastName: 'Sánchez',   email: 'pedro@example.com',  phone: '+34 655 987 654', initials: 'PS', color: 'avatar--cyan',   stage: ClientStage.MAINTENANCE },
    { id: '5', firstName: 'Laura', lastName: 'Fernández', email: 'laura@example.com', phone: '+34 632 456 789', initials: 'LF', color: 'avatar--mint', stage: ClientStage.POST_SALE },
  ]);

  readonly filteredClients = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return q
      ? this.recentClients().filter(
          (c) =>
            c.firstName.toLowerCase().includes(q) ||
            c.lastName.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q),
        )
      : this.recentClients();
  });

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
    });
  }

  onSearch(event: CustomEvent) {
    this.searchQuery.set(event.detail.value ?? '');
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

    const { firstName, lastName, email, phone } = this.addClientForm.getRawValue();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedFirstName || !trimmedLastName || !trimmedEmail || !trimmedPhone) {
      if (!trimmedFirstName) {
        this.addClientForm.controls.firstName.setErrors({ required: true });
      }

      if (!trimmedLastName) {
        this.addClientForm.controls.lastName.setErrors({ required: true });
      }

      if (!trimmedEmail) {
        this.addClientForm.controls.email.setErrors({ required: true });
      }

      if (!trimmedPhone) {
        this.addClientForm.controls.phone.setErrors({ required: true });
      }

      this.addClientForm.markAllAsTouched();
      return;
    }

    const newClient: IClient = {
      id: String(Date.now()),
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      email: trimmedEmail,
      phone: trimmedPhone,
      initials: this.buildInitials(trimmedFirstName, trimmedLastName),
      color: this.clientAvatarColors[this.recentClients().length % this.clientAvatarColors.length],
      stage: ClientStage.FIRST_CONTACT,
      createdAt: new Date().toLocaleDateString('es-ES', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    };

    this.recentClients.update((clients) => [newClient, ...clients]);
    this.stats.update((stats) =>
      stats.map((stat) =>
        stat.label === 'Total de clientes'
          ? { ...stat, value: stat.value + 1 }
          : stat,
      ),
    );

    this.closeAddClientModal();
  }

  resetAddClientForm() {
    this.addClientForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
    });
    this.addClientForm.markAsPristine();
    this.addClientForm.markAsUntouched();
  }

  private buildInitials(firstName: string, lastName: string): string {
    return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
  }
}
