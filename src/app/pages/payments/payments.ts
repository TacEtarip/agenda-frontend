import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonCard,
  IonCardContent,
  IonChip,
  IonIcon,
  IonInput,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import type { SegmentChangeEventDetail } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  cashOutline,
  checkmarkCircleOutline,
  copyOutline,
  logoWhatsapp,
  refreshOutline,
  timeOutline,
  trashOutline,
} from 'ionicons/icons';
import { ClientApiService } from '../../core/services/client-api.service';
import { PaymentMethod } from '../../enums/payment-method.enum';
import { PaymentSourceType } from '../../enums/payment-source-type.enum';
import { PaymentStatus } from '../../enums/payment-status.enum';
import { IClient } from '../../interfaces/client.interface';
import { IPayment } from '../../interfaces/payment.interface';
import { COMMON_ION_PAGE_IMPORTS } from '../../shared/ionic-imports';
import { FormatDatePipe } from '../../shared/pipes/format-date.pipe';
import { FormatPricePipe } from '../../shared/pipes/format-price.pipe';
import { PaymentStore } from '../../shared/stores/payment.store';

type PaymentSegment = PaymentStatus.PENDING | PaymentStatus.PAID;

@Component({
  selector: 'app-payments',
  host: { class: 'ion-page' },
  imports: [
    ...COMMON_ION_PAGE_IMPORTS,
    IonBackButton,
    IonButton,
    IonCard,
    IonCardContent,
    IonChip,
    IonIcon,
    IonInput,
    IonLabel,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    FormatDatePipe,
    FormatPricePipe,
  ],
  templateUrl: './payments.html',
  styleUrl: './payments.scss',
})
export class PaymentsPage {
  private readonly paymentsStore = inject(PaymentStore);
  private readonly clientApi = inject(ClientApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly viewSegment = signal<PaymentSegment>(PaymentStatus.PENDING);
  readonly page = signal(1);
  readonly pageSize = 25;
  readonly clients = signal<Map<string, IClient>>(new Map());
  readonly clientFilter = signal('');
  readonly sourceFilter = signal<PaymentSourceType | ''>('');
  readonly fromFilter = signal('');
  readonly toFilter = signal('');
  readonly payments = this.paymentsStore.payments;
  readonly total = this.paymentsStore.total;
  readonly loading = this.paymentsStore.loading;
  readonly loadError = this.paymentsStore.error;
  readonly pendingCount = computed(() => this.viewSegment() === PaymentStatus.PENDING ? this.total() : 0);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));
  readonly paymentStatus = PaymentStatus;
  readonly sourceType = PaymentSourceType;

  constructor() {
    addIcons({
      alertCircleOutline,
      cashOutline,
      checkmarkCircleOutline,
      copyOutline,
      logoWhatsapp,
      refreshOutline,
      timeOutline,
      trashOutline,
    });
    const status = this.route.snapshot.queryParamMap.get('status');
    if (status === PaymentStatus.PAID) this.viewSegment.set(PaymentStatus.PAID);
    this.page.set(Math.max(1, Number(this.route.snapshot.queryParamMap.get('page')) || 1));
    this.clientFilter.set(this.route.snapshot.queryParamMap.get('client') || '');
    const source = this.route.snapshot.queryParamMap.get('source');
    if (source === PaymentSourceType.APPOINTMENT || source === PaymentSourceType.CLIENT_PRODUCT) this.sourceFilter.set(source);
    this.fromFilter.set(this.route.snapshot.queryParamMap.get('from') || '');
    this.toFilter.set(this.route.snapshot.queryParamMap.get('to') || '');
  }

  ionViewWillEnter(): void {
    this.clientApi.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((clients) => {
      this.clients.set(new Map(clients.map((client) => [client.id, client])));
    });
    this.load();
  }

  onSegmentChange(event: CustomEvent<SegmentChangeEventDetail>): void {
    const status = event.detail.value;
    if (status !== PaymentStatus.PENDING && status !== PaymentStatus.PAID) return;
    this.viewSegment.set(status);
    this.page.set(1);
    this.syncQuery();
    this.load();
  }

  previousPage(): void {
    if (this.page() <= 1) return;
    this.page.update((page) => page - 1);
    this.syncQuery();
    this.load();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) return;
    this.page.update((page) => page + 1);
    this.syncQuery();
    this.load();
  }

  setFilter(filter: 'client' | 'source' | 'from' | 'to', event: Event): void {
    const value = String((event as CustomEvent<{ value?: string | null }>).detail.value ?? '');
    if (filter === 'client') this.clientFilter.set(value);
    if (filter === 'source') this.sourceFilter.set(value as PaymentSourceType | '');
    if (filter === 'from') this.fromFilter.set(value);
    if (filter === 'to') this.toFilter.set(value);
    this.page.set(1);
    this.syncQuery();
    this.load();
  }

  clearFilters(): void {
    this.clientFilter.set('');
    this.sourceFilter.set('');
    this.fromFilter.set('');
    this.toFilter.set('');
    this.page.set(1);
    this.syncQuery();
    this.load();
  }

  clientName(payment: IPayment): string {
    const client = this.clients().get(payment.clientId);
    return client ? `${client.firstName} ${client.lastName}` : 'Cliente';
  }

  sourceLabel(payment: IPayment): string {
    return payment.sourceType === PaymentSourceType.APPOINTMENT ? 'Cita' : 'Producto o servicio';
  }

  methodLabel(method: PaymentMethod): string {
    return ({
      [PaymentMethod.ONLINE]: 'En línea',
      [PaymentMethod.CASH]: 'Efectivo',
      [PaymentMethod.BANK_TRANSFER]: 'Transferencia',
      [PaymentMethod.YAPE]: 'Yape',
      [PaymentMethod.PLIN]: 'Plin',
      [PaymentMethod.CARD]: 'Tarjeta',
      [PaymentMethod.OTHER]: 'Otro',
    })[method];
  }

  async copyLink(payment: IPayment): Promise<void> {
    if (payment.checkoutUrl) await navigator.clipboard.writeText(payment.checkoutUrl);
  }

  sendLink(payment: IPayment): void {
    const client = this.clients().get(payment.clientId);
    if (!client?.phone || !payment.checkoutUrl) return;
    const message = `Hola ${client.firstName}. Te compartimos el enlace de pago por ${payment.description} (${payment.amount.toFixed(2)} PEN): ${payment.checkoutUrl}`;
    window.open(`https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  }

  cancel(payment: IPayment): void {
    this.paymentsStore.cancel(payment.id).subscribe({ next: () => this.load() });
  }

  regenerate(payment: IPayment): void {
    this.paymentsStore.createLink({
      sourceType: payment.sourceType,
      sourceId: payment.sourceId,
      amount: payment.amount,
      description: payment.description,
    }).subscribe({ next: () => this.load() });
  }

  private load(): void {
    this.paymentsStore.load({
      status: this.viewSegment(),
      clientId: this.clientFilter() || undefined,
      sourceType: this.sourceFilter() || undefined,
      from: this.fromFilter() ? new Date(`${this.fromFilter()}T00:00:00`).toISOString() : undefined,
      to: this.toFilter() ? new Date(`${this.toFilter()}T23:59:59`).toISOString() : undefined,
      page: this.page(),
      limit: this.pageSize,
    });
  }

  private syncQuery(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        status: this.viewSegment() === PaymentStatus.PENDING ? null : this.viewSegment(),
        page: this.page() === 1 ? null : this.page(),
        client: this.clientFilter() || null,
        source: this.sourceFilter() || null,
        from: this.fromFilter() || null,
        to: this.toFilter() || null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
