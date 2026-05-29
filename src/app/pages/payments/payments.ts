import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  IonBackButton,
  IonCard,
  IonCardContent,
  IonChip,
  IonIcon,
  IonLabel,
  IonSegment,
  IonSegmentButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  cashOutline,
  checkmarkCircleOutline,
  shareSocialOutline,
  timeOutline,
} from 'ionicons/icons';
import { IAppointmentApi } from '../../core/interfaces/appointment-api.interface';
import { AppointmentApiService } from '../../core/services/appointment-api.service';
import { AuthService } from '../../core/services/auth.service';
import { ClientApiService } from '../../core/services/client-api.service';
import { IClient } from '../../interfaces/client.interface';
import { COMMON_ION_PAGE_IMPORTS } from '../../shared/ionic-imports';

@Component({
  selector: 'app-payments',
  host: { class: 'ion-page' },
  imports: [
    ...COMMON_ION_PAGE_IMPORTS,
    IonCard,
    IonCardContent,
    IonChip,
    IonIcon,
    IonBackButton,
    IonSegment,
    IonSegmentButton,
    IonLabel,
  ],
  templateUrl: './payments.html',
  styleUrl: './payments.scss',
})
export class PaymentsPage {
  private readonly authService = inject(AuthService);
  private readonly appointmentApi = inject(AppointmentApiService);
  private readonly clientApi = inject(ClientApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly viewSegment = signal<'PENDING' | 'COMPLETED'>('PENDING');

  readonly allAppointments = signal<IAppointmentApi[]>([]);
  readonly allClients = signal<Map<string, IClient>>(new Map());

  readonly pendingPayments = computed(() => {
    return this.allAppointments()
      .filter((a) => a.status === 'pending_payment')
      .map((a) => this.mapToPaymentView(a));
  });

  readonly completedPayments = computed(() => {
    return this.allAppointments()
      .filter((a) => a.status === 'scheduled' && a.paymentId)
      .map((a) => this.mapToPaymentView(a));
  });

  constructor() {
    addIcons({
      cashOutline,
      checkmarkCircleOutline,
      timeOutline,
      shareSocialOutline,
      alertCircleOutline,
    });
  }

  ionViewWillEnter(): void {
    const userId = this.authService.currentUser()?.userId;
    if (!userId) return;

    this.clientApi
      .getAllByUser(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((clients) => {
        const clientMap = new Map<string, IClient>();
        clients.forEach((c) => clientMap.set(c.id, c));
        this.allClients.set(clientMap);
      });

    this.appointmentApi
      .getAllByUser(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((appts) => {
        // Sort newest first based on startTime
        appts.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        this.allAppointments.set(appts);
      });
  }

  onSegmentChange(event: any) {
    this.viewSegment.set(event.detail.value);
  }

  resendPaymentLink(payment: any) {
    // Implementar lógica simple para enviar por ws
    const text = `Hola ${payment.clientName}. Te compartimos de nuevo tu enlace de pago para tu cita del ${payment.date}: ${payment.paymentUrl}`;
    window.open(
      `https://wa.me/${payment.clientPhone.replace('+', '')}?text=${encodeURIComponent(text)}`,
      '_blank',
    );
  }

  private mapToPaymentView(a: IAppointmentApi) {
    const client = this.allClients().get(a.clientId);
    return {
      id: a.id,
      clientName: client ? `${client.firstName} ${client.lastName}` : 'Desconocido',
      clientPhone: client?.phone || '',
      title: a.title,
      date: new Date(a.startTime).toLocaleDateString('es-ES'),
      status: a.status,
      paymentId: a.paymentId,
      paymentUrl: a.paymentUrl,
    };
  }
}
