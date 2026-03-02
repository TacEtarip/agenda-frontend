import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  peopleOutline,
  calendarOutline,
  timeOutline,
  addOutline,
  notificationsOutline,
  chevronForwardOutline,
  callOutline,
} from 'ionicons/icons';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonCard,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonAvatar,
  IonBadge,
  IonIcon,
  IonFab,
  IonFabButton,
  IonSearchbar,
  IonChip,
} from '@ionic/angular/standalone';

interface Appointment {
  id: string;
  clientName: string;
  initials: string;
  title: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  initials: string;
  color: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonCard,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonAvatar,
    IonBadge,
    IonIcon,
    IonFab,
    IonFabButton,
    IonSearchbar,
    IonChip,
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

  readonly upcomingAppointments = signal<Appointment[]>([
    { id: '1', clientName: 'María García', initials: 'MG', title: 'Initial Consultation', time: '10:00 AM', status: 'scheduled' },
    { id: '2', clientName: 'Carlos López', initials: 'CL', title: 'Follow-up Session', time: '2:30 PM', status: 'scheduled' },
    { id: '3', clientName: 'Ana Martínez', initials: 'AM', title: 'New Client Meeting', time: '4:00 PM', status: 'scheduled' },
  ]);

  readonly recentClients = signal<Client[]>([
    { id: '1', firstName: 'María', lastName: 'García', email: 'maria@example.com', phone: '+34 612 345 678', initials: 'MG', color: 'avatar--sky' },
    { id: '2', firstName: 'Carlos', lastName: 'López', email: 'carlos@example.com', phone: '+34 698 765 432', initials: 'CL', color: 'avatar--green' },
    { id: '3', firstName: 'Ana', lastName: 'Martínez', email: 'ana@example.com', phone: '+34 677 123 456', initials: 'AM', color: 'avatar--indigo' },
    { id: '4', firstName: 'Pedro', lastName: 'Sánchez', email: 'pedro@example.com', phone: '+34 655 987 654', initials: 'PS', color: 'avatar--cyan' },
    { id: '5', firstName: 'Laura', lastName: 'Fernández', email: 'laura@example.com', phone: '+34 632 456 789', initials: 'LF', color: 'avatar--mint' },
  ]);

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
    });
  }

  onSearch(event: CustomEvent) {
    this.searchQuery.set(event.detail.value ?? '');
  }
}
