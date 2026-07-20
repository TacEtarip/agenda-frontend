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
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cashOutline,
  checkmarkCircleOutline,
  closeOutline,
  copyOutline,
  downloadOutline,
  linkOutline,
  logoWhatsapp,
  qrCodeOutline,
} from 'ionicons/icons';
import { PaymentMethod } from '../../../enums/payment-method.enum';
import { PaymentSourceType } from '../../../enums/payment-source-type.enum';
import { IPayment } from '../../../interfaces/payment.interface';
import { FormatPricePipe } from '../../pipes/format-price.pipe';
import { PaymentStore } from '../../stores/payment.store';
import { IYapeConfiguration } from '../../../interfaces/yape-configuration.interface';

type PaymentFormMode = 'YAPE' | 'LINK' | 'MANUAL';

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
  private readonly alertController = inject(AlertController);

  readonly opened = input.required<boolean>();
  readonly sourceType = input.required<PaymentSourceType>();
  readonly sourceId = input.required<string>();
  readonly concept = input.required<string>();
  readonly suggestedAmount = input<number | undefined>();
  readonly clientName = input.required<string>();
  readonly clientPhone = input('');

  readonly closed = output<void>();
  readonly paymentCompleted = output<IPayment>();

  readonly mode = signal<PaymentFormMode>('YAPE');
  readonly amount = signal('');
  readonly description = signal('');
  readonly method = signal<PaymentMethod>(PaymentMethod.YAPE);
  readonly paidAt = signal(this.today());
  readonly reference = signal('');
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly generatedPayment = signal<IPayment | null>(null);
  readonly copied = signal(false);
  readonly yapeConfiguration = signal<IYapeConfiguration | null>(null);
  readonly loadingYapeConfiguration = signal(false);
  readonly methods = [
    PaymentMethod.CASH,
    PaymentMethod.BANK_TRANSFER,
    PaymentMethod.YAPE,
    PaymentMethod.PLIN,
    PaymentMethod.CARD,
    PaymentMethod.OTHER,
  ];

  constructor() {
    addIcons({
      cashOutline,
      checkmarkCircleOutline,
      closeOutline,
      copyOutline,
      downloadOutline,
      linkOutline,
      logoWhatsapp,
      qrCodeOutline,
    });
  }

  reset(): void {
    this.mode.set('YAPE');
    this.amount.set(this.suggestedAmount()?.toFixed(2) ?? '');
    this.description.set(this.concept());
    this.method.set(PaymentMethod.YAPE);
    this.paidAt.set(this.today());
    this.reference.set('');
    this.error.set(null);
    this.generatedPayment.set(null);
    this.copied.set(false);
    this.loadYapeConfiguration();
  }

  changeMode(event: Event): void {
    const value = (event as CustomEvent<{ value?: PaymentFormMode }>).detail.value;
    if (value === 'YAPE' || value === 'LINK' || value === 'MANUAL') this.mode.set(value);
  }

  setText(target: 'amount' | 'description' | 'paidAt' | 'reference', event: Event): void {
    const value = String(
      (event as CustomEvent<{ value?: string | number | null }>).detail.value ?? '',
    );
    this[target].set(value);
  }

  setAmount(event: Event): void {
    const input = event.target as HTMLIonInputElement;
    const rawValue = String(
      (event as CustomEvent<{ value?: string | number | null }>).detail.value ?? '',
    );
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
    const value = String(
      (event as CustomEvent<{ value?: string | string[] | null }>).detail.value ?? '',
    );
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
    const request =
      this.mode() === 'YAPE'
        ? this.payments.createYapeRequest(base)
        : this.mode() === 'LINK'
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

  async copyYapeInstructions(): Promise<void> {
    const message = this.yapeInstructions();
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      this.copied.set(true);
      this.error.set(null);
    } catch {
      this.error.set('No se pudieron copiar las instrucciones.');
    }
  }

  downloadYapeQr(): void {
    const image = this.yapeConfiguration()?.qrImageDataUrl;
    if (!image) return;
    const link = document.createElement('a');
    link.href = image;
    link.download = 'qr-yape.png';
    link.click();
  }

  async confirmYapePayment(): Promise<void> {
    const payment = this.generatedPayment();
    if (!payment || this.submitting()) return;
    const alert = await this.alertController.create({
      header: 'Confirmar pago recibido',
      message:
        'Confirma únicamente después de verificar el ingreso en tu aplicación Yape. Esta acción marcará el cobro como pagado.',
      buttons: [
        { text: 'Todavía no', role: 'cancel' },
        { text: 'Sí, lo recibí', role: 'confirm' },
      ],
    });
    await alert.present();
    const result = await alert.onDidDismiss();
    if (result.role !== 'confirm') return;
    this.submitting.set(true);
    this.error.set(null);
    this.payments.confirmYape(payment.id).subscribe({
      next: (confirmed) => {
        this.submitting.set(false);
        this.generatedPayment.set(confirmed);
        this.paymentCompleted.emit(confirmed);
      },
      error: (response) => {
        this.submitting.set(false);
        this.error.set(response?.error?.message || 'No se pudo confirmar el pago.');
      },
    });
  }

  readonly canDismiss = (): boolean => !this.submitting();

  requestClose(): void {
    if (!this.submitting()) this.closed.emit();
  }

  sendWhatsApp(): void {
    const payment = this.generatedPayment();
    if (!payment || !this.clientPhone()) return;
    const phone = this.clientPhone().replace(/\D/g, '');
    const message =
      this.mode() === 'YAPE'
        ? this.yapeInstructions()
        : payment.checkoutUrl
          ? `Hola ${this.clientName()}. Te compartimos el enlace de pago por ${payment.description} (${payment.amount.toFixed(2)} PEN): ${payment.checkoutUrl}`
          : '';
    if (!message) return;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  }

  private loadYapeConfiguration(): void {
    this.loadingYapeConfiguration.set(true);
    this.payments.getYapeConfiguration().subscribe({
      next: (configuration) => {
        this.yapeConfiguration.set(configuration);
        this.loadingYapeConfiguration.set(false);
      },
      error: () => {
        this.yapeConfiguration.set(null);
        this.loadingYapeConfiguration.set(false);
        this.error.set('No se pudo consultar la configuración de Yape.');
      },
    });
  }

  yapeInstructions(): string {
    const payment = this.generatedPayment();
    const configuration = this.yapeConfiguration();
    if (!payment || !configuration?.phone || !configuration.accountName) return '';
    return `Hola ${this.clientName()}. El pago por ${payment.description} es de S/ ${payment.amount.toFixed(2)}. Puedes yapear al ${configuration.phone}, a nombre de ${configuration.accountName}. Después envíanos la constancia, por favor.`;
  }

  methodLabel(method: PaymentMethod): string {
    return {
      [PaymentMethod.ONLINE]: 'En línea',
      [PaymentMethod.CASH]: 'Efectivo',
      [PaymentMethod.BANK_TRANSFER]: 'Transferencia bancaria',
      [PaymentMethod.YAPE]: 'Yape',
      [PaymentMethod.PLIN]: 'Plin',
      [PaymentMethod.CARD]: 'Tarjeta',
      [PaymentMethod.OTHER]: 'Otro',
    }[method];
  }

  private today(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
}
