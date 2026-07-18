import { Component, input, output, signal, inject } from '@angular/core';
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
  IonLabel,
  IonModal,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cashOutline, closeOutline, copyOutline, linkOutline, logoWhatsapp } from 'ionicons/icons';
import { PaymentMethod } from '../../../enums/payment-method.enum';
import { PaymentSourceType } from '../../../enums/payment-source-type.enum';
import { IPayment } from '../../../interfaces/payment.interface';
import { FormatPricePipe } from '../../pipes/format-price.pipe';
import { PaymentStore } from '../../stores/payment.store';

type PaymentFormMode = 'LINK' | 'MANUAL';

@Component({
  selector: 'app-payment-form-modal',
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
    IonLabel,
    IonModal,
    IonNote,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonTitle,
    IonToolbar,
    FormatPricePipe,
  ],
  templateUrl: './payment-form-modal.html',
  styleUrl: './payment-form-modal.scss',
})
export class PaymentFormModal {
  private readonly payments = inject(PaymentStore);

  readonly opened = input.required<boolean>();
  readonly sourceType = input.required<PaymentSourceType>();
  readonly sourceId = input.required<string>();
  readonly concept = input.required<string>();
  readonly suggestedAmount = input<number | undefined>();
  readonly clientName = input.required<string>();
  readonly clientPhone = input('');

  readonly closed = output<void>();
  readonly paymentCompleted = output<IPayment>();

  readonly mode = signal<PaymentFormMode>('LINK');
  readonly amount = signal('');
  readonly description = signal('');
  readonly method = signal<PaymentMethod>(PaymentMethod.YAPE);
  readonly paidAt = signal(this.today());
  readonly reference = signal('');
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly generatedPayment = signal<IPayment | null>(null);
  readonly copied = signal(false);
  readonly methods = [
    PaymentMethod.CASH,
    PaymentMethod.BANK_TRANSFER,
    PaymentMethod.YAPE,
    PaymentMethod.PLIN,
    PaymentMethod.CARD,
    PaymentMethod.OTHER,
  ];

  constructor() {
    addIcons({ cashOutline, closeOutline, copyOutline, linkOutline, logoWhatsapp });
  }

  reset(): void {
    this.mode.set('LINK');
    this.amount.set(this.suggestedAmount()?.toFixed(2) ?? '');
    this.description.set(this.concept());
    this.method.set(PaymentMethod.YAPE);
    this.paidAt.set(this.today());
    this.reference.set('');
    this.error.set(null);
    this.generatedPayment.set(null);
    this.copied.set(false);
  }

  changeMode(event: Event): void {
    const value = (event as CustomEvent<{ value?: PaymentFormMode }>).detail.value;
    if (value === 'LINK' || value === 'MANUAL') this.mode.set(value);
  }

  setText(target: 'amount' | 'description' | 'paidAt' | 'reference', event: Event): void {
    const value = String((event as CustomEvent<{ value?: string | number | null }>).detail.value ?? '');
    this[target].set(value);
  }

  setAmount(event: Event): void {
    const input = event.target as HTMLIonInputElement;
    const rawValue = String((event as CustomEvent<{ value?: string | number | null }>).detail.value ?? '');
    const normalized = rawValue.replace(',', '.').replace(/[^\d.]/g, '');
    const [integer = '', ...decimalParts] = normalized.split('.');
    const sanitized = decimalParts.length
      ? `${integer}.${decimalParts.join('').slice(0, 2)}`
      : integer;

    input.value = sanitized;
    this.amount.set(sanitized);
    this.error.set(null);
  }

  formatAmount(): void {
    const value = Number(this.amount());
    if (Number.isFinite(value) && value > 0) this.amount.set(value.toFixed(2));
  }

  setPaidAt(event: Event): void {
    const value = String((event as CustomEvent<{ value?: string | string[] | null }>).detail.value ?? '');
    if (value) this.paidAt.set(value.slice(0, 10));
  }

  setMethod(event: Event): void {
    const value = (event as CustomEvent<{ value?: PaymentMethod }>).detail.value;
    if (value && value !== PaymentMethod.ONLINE) this.method.set(value);
  }

  submit(): void {
    if (this.submitting()) return;
    const amount = Number(this.amount().replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      this.error.set('Ingresa un monto mayor a cero.');
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    const base = {
      sourceType: this.sourceType(),
      sourceId: this.sourceId(),
      amount,
      description: this.description().trim() || this.concept(),
    };
    const request = this.mode() === 'LINK'
      ? this.payments.createLink(base)
      : this.payments.registerManual({
          ...base,
          method: this.method() as Exclude<PaymentMethod, PaymentMethod.ONLINE>,
          paidAt: new Date(`${this.paidAt()}T12:00:00`).toISOString(),
          reference: this.reference().trim() || undefined,
        });

    request.subscribe({
      next: (payment) => {
        this.submitting.set(false);
        this.paymentCompleted.emit(payment);
        this.generatedPayment.set(payment);
      },
      error: (response) => {
        this.submitting.set(false);
        this.error.set(response?.error?.message || 'No se pudo registrar el pago.');
      },
    });
  }

  async copyLink(): Promise<void> {
    const url = this.generatedPayment()?.checkoutUrl;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      this.copied.set(true);
      this.error.set(null);
    } catch {
      this.error.set('No se pudo copiar el enlace. Selecciónalo y cópialo manualmente.');
    }
  }

  readonly canDismiss = (): boolean => !this.submitting();

  requestClose(): void {
    if (!this.submitting()) this.closed.emit();
  }

  sendWhatsApp(): void {
    const payment = this.generatedPayment();
    if (!payment?.checkoutUrl || !this.clientPhone()) return;
    const phone = this.clientPhone().replace(/\D/g, '');
    const message = `Hola ${this.clientName()}. Te compartimos el enlace de pago por ${payment.description} (${payment.amount.toFixed(2)} PEN): ${payment.checkoutUrl}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  }

  methodLabel(method: PaymentMethod): string {
    return ({
      [PaymentMethod.ONLINE]: 'En línea',
      [PaymentMethod.CASH]: 'Efectivo',
      [PaymentMethod.BANK_TRANSFER]: 'Transferencia bancaria',
      [PaymentMethod.YAPE]: 'Yape',
      [PaymentMethod.PLIN]: 'Plin',
      [PaymentMethod.CARD]: 'Tarjeta',
      [PaymentMethod.OTHER]: 'Otro',
    })[method];
  }

  private today(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
}
