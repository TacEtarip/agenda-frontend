import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
  arrowBackOutline,
} from 'ionicons/icons';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonContent,
  IonCard,
  IonCardContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonList,
  IonItem,
  IonIcon,
  IonBadge,
  IonChip,
  IonNote,
  IonFab,
  IonFabButton,
} from '@ionic/angular/standalone';

type Segment = 'notes' | 'appointments' | 'attachments';

interface Note {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface Appointment {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: string;
  uploadedAt: string;
  icon: string;
}

@Component({
  selector: 'app-client-detail',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonCard,
    IonCardContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonList,
    IonItem,
    IonIcon,
    IonBadge,
    IonChip,
    IonNote,
    IonFab,
    IonFabButton,
  ],
  templateUrl: './client-detail.html',
  styleUrl: './client-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientDetailPage {
  private readonly route = inject(ActivatedRoute);
  readonly clientId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly activeSegment = signal<Segment>('notes');

  // Mock client data — will be replaced by API call
  readonly client = signal({
    id: this.clientId,
    firstName: 'María',
    lastName: 'García',
    email: 'maria.garcia@example.com',
    phone: '+34 612 345 678',
    initials: 'MG',
    color: 'avatar--blue',
    createdAt: 'Jan 15, 2026',
  });

  readonly notes = signal<Note[]>([
    {
      id: '1',
      content: 'Client prefers morning appointments. Very interested in the premium plan. Has two dogs — mention pet policy.',
      createdAt: 'Feb 28, 2026',
      updatedAt: 'Feb 28, 2026',
    },
    {
      id: '2',
      content: 'Follow-up needed regarding the proposal sent on 02/20. She mentioned budget concerns — prepare alternative options.',
      createdAt: 'Feb 20, 2026',
      updatedAt: 'Feb 25, 2026',
    },
  ]);

  readonly appointments = signal<Appointment[]>([
    {
      id: '1',
      title: 'Initial Consultation',
      description: 'First meeting to assess requirements and expectations.',
      startTime: 'Mar 5, 2026 · 10:00 AM',
      endTime: '11:00 AM',
      status: 'scheduled',
    },
    {
      id: '2',
      title: 'Follow-up Session',
      description: 'Review the proposal and address budget concerns.',
      startTime: 'Feb 20, 2026 · 3:00 PM',
      endTime: '4:00 PM',
      status: 'completed',
    },
  ]);

  readonly attachments = signal<Attachment[]>([
    { id: '1', fileName: 'proposal_v2.pdf', fileType: 'PDF', fileSize: '1.2 MB', uploadedAt: 'Feb 20, 2026', icon: 'document-outline' },
    { id: '2', fileName: 'client_photo.jpg', fileType: 'Image', fileSize: '840 KB', uploadedAt: 'Jan 15, 2026', icon: 'image-outline' },
  ]);

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
      arrowBackOutline,
    });
  }

  onSegmentChange(event: CustomEvent) {
    this.activeSegment.set(event.detail.value as Segment);
  }

  statusColor(status: Appointment['status']): string {
    return status === 'scheduled' ? 'primary' : status === 'completed' ? 'success' : 'danger';
  }
}
