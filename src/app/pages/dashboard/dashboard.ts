import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
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
  notificationsOutline,
  chevronForwardOutline,
  callOutline,
  swapHorizontalOutline,
} from 'ionicons/icons';
import {
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
  readonly userName = signal('Alex');
  readonly searchQuery = signal('');

  readonly stats = signal([
    { label: 'Total Clients', value: 24, icon: 'people-outline', color: 'stat-icon--sky' },
    { label: 'Today', value: 3, icon: 'time-outline', color: 'stat-icon--green' },
    { label: 'This Week', value: 8, icon: 'calendar-outline', color: 'stat-icon--indigo' },
  ]);

  readonly upcomingAppointments = signal<IDashboardAppointment[]>([
    { id: '1', clientName: 'María García', initials: 'MG', title: 'Initial Consultation', time: '10:00 AM', status: 'scheduled' },
    { id: '2', clientName: 'Carlos López', initials: 'CL', title: 'Follow-up Session', time: '2:30 PM', status: 'scheduled' },
    { id: '3', clientName: 'Ana Martínez', initials: 'AM', title: 'New Client Meeting', time: '4:00 PM', status: 'scheduled' },
  ]);

  readonly recentClients = signal<IClient[]>([
    { id: '1', firstName: 'María',  lastName: 'García',    email: 'maria@example.com',  phone: '+34 612 345 678', initials: 'MG', color: 'avatar--sky',    stage: ClientStage.FOLLOW_UP },
    { id: '2', firstName: 'Carlos', lastName: 'López',     email: 'carlos@example.com', phone: '+34 698 765 432', initials: 'CL', color: 'avatar--green',  stage: ClientStage.FIRST_CONTACT },
    { id: '3', firstName: 'Ana',    lastName: 'Martínez',  email: 'ana@example.com',    phone: '+34 677 123 456', initials: 'AM', color: 'avatar--indigo', stage: ClientStage.CLOSED_SALE },
    { id: '4', firstName: 'Pedro',  lastName: 'Sánchez',   email: 'pedro@example.com',  phone: '+34 655 987 654', initials: 'PS', color: 'avatar--cyan',   stage: ClientStage.MAINTENANCE },
    { id: '5', firstName: 'Laura', lastName: 'Fernández', email: 'laura@example.com', phone: '+34 632 456 789', initials: 'LF', color: 'avatar--mint', stage: ClientStage.POST_SALE },
  ]);

  private readonly stageMetadata: IClientStageOption[] = [
    { value: ClientStage.FIRST_CONTACT, label: 'First Contact', color: 'primary' },
    { value: ClientStage.FOLLOW_UP,     label: 'Follow-Up',     color: 'warning' },
    { value: ClientStage.CLOSED_SALE,   label: 'Closed Sale',   color: 'success' },
    { value: ClientStage.MAINTENANCE,   label: 'Maintenance',   color: 'tertiary' },
    { value: ClientStage.POST_SALE,     label: 'Post Sale',     color: 'medium' },
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
      notificationsOutline,
      chevronForwardOutline,
      callOutline,
      swapHorizontalOutline,
    });
  }

  onSearch(event: CustomEvent) {
    this.searchQuery.set(event.detail.value ?? '');
  }
}
