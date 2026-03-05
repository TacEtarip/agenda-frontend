import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClientStage } from '../../enums/client-stage.enum';
import { IClient } from '../../interfaces/client.interface';
import { IClientStageOption } from '../../interfaces/client-stage-option.interface';
import { IDashboardAppointment } from '../../interfaces/dashboard-appointment.interface';
import { COMMON_ION_PAGE_IMPORTS } from '../../shared/ionic-imports';
import { addIcons } from 'ionicons';
import {
  peopleOutline,
  calendarOutline,
  timeOutline,
  addOutline,
  settingsOutline,
  notificationsOutline,
  chevronForwardOutline,
  callOutline,
  pricetagOutline,
} from 'ionicons/icons';
import {
  AlertController,
  IonAvatar,
  IonSearchbar,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    ...COMMON_ION_PAGE_IMPORTS,
    IonAvatar,
    IonSearchbar,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly alertCtrl = inject(AlertController);
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

  private readonly stageMetadata: IClientStageOption[] = [
    { value: ClientStage.FIRST_CONTACT, label: 'Primer contacto', color: 'primary' },
    { value: ClientStage.FOLLOW_UP,     label: 'Seguimiento',     color: 'warning' },
    { value: ClientStage.CLOSED_SALE,   label: 'Venta cerrada',   color: 'success' },
    { value: ClientStage.MAINTENANCE,   label: 'Mantenimiento', color: 'tertiary' },
    { value: ClientStage.POST_SALE,     label: 'Postventa',     color: 'medium' },
  ];

  stageLabel(stage: ClientStage): string {
    return this.stageMetadata.find((s) => s.value === stage)?.label ?? stage;
  }

  stageColor(stage: ClientStage): string {
    return this.stageMetadata.find((s) => s.value === stage)?.color ?? 'medium';
  }

  readonly filteredClients = () => {
    const q = this.searchQuery().toLowerCase();
    return q
      ? this.recentClients().filter(
          (c) =>
            c.firstName.toLowerCase().includes(q) ||
            c.lastName.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q),
        )
      : this.recentClients();
  };

  constructor() {
    addIcons({
      peopleOutline,
      calendarOutline,
      timeOutline,
      addOutline,
      settingsOutline,
      notificationsOutline,
      chevronForwardOutline,
      callOutline,
      pricetagOutline,
    });
  }

  onSearch(event: CustomEvent) {
    this.searchQuery.set(event.detail.value ?? '');
  }

  toggleAppointmentsView() {
    this.showAllAppointments.update((current) => !current);
  }

  appointmentStatusLabel(status: IDashboardAppointment['status']): string {
    if (status === 'scheduled') return 'Programada';
    if (status === 'completed') return 'Completada';
    return 'Cancelada';
  }

  async openAddClientAlert() {
    const alert = await this.alertCtrl.create({
      header: 'Agregar cliente',
      message: 'Crea un cliente para agregarlo a la lista del panel.',
      inputs: [
        {
          name: 'firstName',
          type: 'text',
          placeholder: 'Nombre',
        },
        {
          name: 'lastName',
          type: 'text',
          placeholder: 'Apellido',
        },
        {
          name: 'email',
          type: 'email',
          placeholder: 'Correo electrónico',
        },
        {
          name: 'phone',
          type: 'tel',
          placeholder: 'Número de teléfono',
        },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Agregar',
          handler: (data: { firstName?: string; lastName?: string; email?: string; phone?: string }) => {
            const firstName = data.firstName?.trim() ?? '';
            const lastName = data.lastName?.trim() ?? '';
            const email = data.email?.trim() ?? '';
            const phone = data.phone?.trim() ?? '';

            if (!firstName || !lastName || !email || !phone) {
              return false;
            }

            const newClient: IClient = {
              id: String(Date.now()),
              firstName,
              lastName,
              email,
              phone,
              initials: this.buildInitials(firstName, lastName),
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
                  ? { ...stat, value: Number(stat.value) + 1 }
                  : stat,
              ),
            );

            return true;
          },
        },
      ],
    });

    await alert.present();
  }

  private buildInitials(firstName: string, lastName: string): string {
    return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
  }
}
