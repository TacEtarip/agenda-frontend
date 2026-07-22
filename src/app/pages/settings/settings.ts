import { Component, computed, effect, inject, signal, DestroyRef, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import * as QRCode from 'qrcode';
import { COMMON_ION_PAGE_IMPORTS } from '../../shared/ionic-imports';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  calendarClearOutline,
  checkmarkCircleOutline,
  informationCircleOutline,
  logoGoogle,
  logoMicrosoft,
  logoWhatsapp,
  notificationsOutline,
  personCircleOutline,
  settingsOutline,
  syncOutline,
  refreshOutline,
  cardOutline,
  cashOutline,
} from 'ionicons/icons';
import {
  IonBackButton,
  IonButton,
  IonInput,
  IonRadio,
  IonRadioGroup,
  IonToggle,
  IonSpinner,
  IonContent,
  AlertController,
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';
import { WhatsAppApiService } from '../../core/services/whatsapp-api.service';
import { MessagingStatus } from '../../types/messaging-status.type';
import { IntegrationProvider } from './enums/integration-provider.enum';
import { IntegrationPreference } from './enums/integration-preference.enum';
import { IIntegrationSettings } from './interfaces/integration-settings.interface';
import { IUserSettingsStorage } from './interfaces/user-settings-storage.interface';
import {
  DEFAULT_INTEGRATION_SETTINGS,
  SETTINGS_STORAGE_KEY,
  VALID_INTEGRATION_PROVIDERS,
} from './constants/settings.constants';
import { UserApiService } from '../../core/services/user-api.service';
import { UserMenuComponent } from '../../shared/components/user-menu/user-menu';
import { GoogleIntegrationApiService } from '../../core/services/google-integration-api.service';
import { IGoogleIntegrationStatus } from '../../core/interfaces/google-integration-status.interface';
import { PaymentStore } from '../../shared/stores/payment.store';
import { CulqiEnvironment } from '../../interfaces/culqi-configuration.interface';

@Component({
  selector: 'app-settings',
  host: { class: 'ion-page' },
  imports: [
    ReactiveFormsModule,
    ...COMMON_ION_PAGE_IMPORTS,
    IonBackButton,
    IonButton,
    IonInput,
    IonRadioGroup,
    IonRadio,
    IonToggle,
    IonSpinner,
    UserMenuComponent,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class SettingsPage {
  readonly IntegrationPreference = IntegrationPreference;
  readonly IntegrationProvider = IntegrationProvider;
  private readonly content = viewChild.required(IonContent);

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly whatsappApi = inject(WhatsAppApiService);
  private readonly userApi = inject(UserApiService);
  private readonly googleIntegrationApi = inject(GoogleIntegrationApiService);
  private readonly payments = inject(PaymentStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly storedSettings = this.loadStoredSettings();
  private lastPersistedSettings: IUserSettingsStorage = this.storedSettings;
  private readonly alertCtrl = inject(AlertController);

  readonly profileForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(60)]],
    lastName: ['', [Validators.required, Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
  });

  readonly yapeForm = this.fb.nonNullable.group({
    enabled: [false],
    phone: ['', [Validators.pattern(/^9\d{8}$/)]],
    accountName: ['', [Validators.maxLength(120)]],
  });
  readonly yapeQrImage = signal<string | null>(null);
  readonly isYapeLoading = signal(false);
  readonly isYapeSaving = signal(false);
  readonly yapeMessage = signal<string | null>(null);
  readonly yapeError = signal<string | null>(null);

  readonly culqiForm = this.fb.nonNullable.group({
    enabled: [false],
    publicKey: ['', [Validators.maxLength(255), Validators.pattern(/^pk_(test|live)_.+$/)]],
    privateKey: ['', [Validators.maxLength(255), Validators.pattern(/^sk_(test|live)_.+$/)]],
  });
  readonly advancedPaymentSettingsOpened = signal(false);
  readonly culqiConfigurationLoaded = signal(false);
  readonly culqiPrivateKeyConfigured = signal(false);
  readonly culqiEncryptionReady = signal(false);
  readonly culqiEnvironment = signal<CulqiEnvironment | null>(null);
  readonly isCulqiLoading = signal(false);
  readonly isCulqiSaving = signal(false);
  readonly culqiMessage = signal<string | null>(null);
  readonly culqiError = signal<string | null>(null);

  readonly currentIntegration = signal<IntegrationProvider>(
    this.storedSettings.integrationProvider,
  );
  readonly integrationSettings = signal<IIntegrationSettings>(
    this.storedSettings.integrationSettings,
  );

  readonly enablePayments = signal<boolean>(this.storedSettings.enablePayments);

  readonly profileSavedMessage = signal<string | null>(null);
  readonly isProfileLoading = signal(false);
  readonly integrationSavedMessage = signal<string | null>(null);
  readonly integrationErrorMessage = signal<string | null>(null);
  readonly googleError = signal<string | null>(null);
  readonly whatsappError = signal<string | null>(null);
  readonly whatsappQrError = signal<string | null>(null);
  readonly isSavingIntegration = signal(false);
  readonly googleStatus = signal<IGoogleIntegrationStatus>({
    configured: false,
    connected: false,
    scopes: [],
  });
  readonly isGoogleLoading = signal(false);
  readonly activeSection = signal('profile-settings');

  // WhatsApp Signals
  readonly whatsappStatus = signal<MessagingStatus>('INITIALIZING');
  readonly whatsappQrImage = signal<string | null>(null);
  readonly isPollingQr = signal<boolean>(false);
  readonly integrationTitle = computed(() => {
    const provider = this.currentIntegration();
    if (provider === IntegrationProvider.GOOGLE) return 'Google Workspace';
    if (provider === IntegrationProvider.MICROSOFT) return 'Microsoft 365';
    return 'Sin integración';
  });
  readonly integrationDescription = computed(() => {
    const provider = this.currentIntegration();
    if (provider === IntegrationProvider.GOOGLE) {
      return 'Vincula Google Calendar para sincronizar tus citas.';
    }

    if (provider === IntegrationProvider.MICROSOFT) {
      return 'Sincroniza calendario y contactos de Microsoft 365.';
    }

    return 'Modo local: no se sincroniza información externa.';
  });

  constructor() {
    addIcons({
      arrowBackOutline,
      calendarClearOutline,
      checkmarkCircleOutline,
      informationCircleOutline,
      logoGoogle,
      logoMicrosoft,
      logoWhatsapp,
      notificationsOutline,
      personCircleOutline,
      settingsOutline,
      syncOutline,
      refreshOutline,
      cardOutline,
      cashOutline,
    });

    effect(() => {
      const user = this.authService.currentUser();
      this.profileForm.reset(
        {
          firstName: user?.firstName ?? '',
          lastName: user?.lastName ?? '',
          email: user?.email ?? '',
          phone: user?.phone ?? '',
        },
        { emitEvent: false },
      );
      this.profileForm.markAsPristine();
      this.profileForm.markAsUntouched();
    });

    this.checkWhatsappStatus();
    this.loadProfile();
    this.handleGoogleCallbackResult();
    this.loadGoogleStatus();
    this.loadYapeConfiguration();
  }

  toggleAdvancedPaymentSettings(event: Event): void {
    const opened = (event.currentTarget as HTMLDetailsElement).open;
    this.advancedPaymentSettingsOpened.set(opened);
    if (opened && !this.culqiConfigurationLoaded() && !this.isCulqiLoading()) {
      this.loadCulqiConfiguration();
    }
  }

  loadCulqiConfiguration(): void {
    if (this.isCulqiLoading()) return;
    this.isCulqiLoading.set(true);
    this.culqiError.set(null);
    this.payments
      .getCulqiConfiguration()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (configuration) => {
          this.culqiForm.reset(
            {
              enabled: configuration.enabled,
              publicKey: configuration.publicKey ?? '',
              privateKey: '',
            },
            { emitEvent: false },
          );
          this.culqiPrivateKeyConfigured.set(configuration.privateKeyConfigured);
          this.culqiEncryptionReady.set(configuration.encryptionReady);
          this.culqiEnvironment.set(configuration.environment ?? null);
          this.culqiConfigurationLoaded.set(true);
          this.culqiForm.markAsPristine();
          this.isCulqiLoading.set(false);
        },
        error: () => {
          this.culqiConfigurationLoaded.set(false);
          this.isCulqiLoading.set(false);
          this.culqiError.set('No se pudo cargar la configuración de Culqi.');
        },
      });
  }

  saveCulqiConfiguration(): void {
    const value = this.culqiForm.getRawValue();
    const publicKey = value.publicKey.trim();
    const privateKey = value.privateKey.trim();
    if (value.enabled && (!publicKey || (!privateKey && !this.culqiPrivateKeyConfigured()))) {
      this.culqiError.set(
        'Ingresa las llaves pública y privada del negocio antes de habilitar Culqi.',
      );
      this.culqiForm.markAllAsTouched();
      return;
    }
    if ((value.enabled || privateKey) && !this.culqiEncryptionReady()) {
      this.culqiError.set(
        'El servidor todavía no tiene configurado el cifrado para credenciales de pago.',
      );
      return;
    }
    if (this.culqiForm.invalid || this.isCulqiSaving()) {
      this.culqiForm.markAllAsTouched();
      return;
    }
    this.isCulqiSaving.set(true);
    this.culqiMessage.set(null);
    this.culqiError.set(null);
    this.payments
      .updateCulqiConfiguration({
        enabled: value.enabled,
        publicKey: publicKey || undefined,
        privateKey: privateKey || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (configuration) => {
          this.isCulqiSaving.set(false);
          this.culqiForm.reset(
            {
              enabled: configuration.enabled,
              publicKey: configuration.publicKey ?? '',
              privateKey: '',
            },
            { emitEvent: false },
          );
          this.culqiPrivateKeyConfigured.set(configuration.privateKeyConfigured);
          this.culqiEncryptionReady.set(configuration.encryptionReady);
          this.culqiEnvironment.set(configuration.environment ?? null);
          this.culqiForm.markAsPristine();
          this.culqiMessage.set(
            configuration.enabled
              ? 'La cuenta Culqi de este negocio quedó preparada.'
              : 'La integración Culqi quedó desactivada; sus llaves se conservaron.',
          );
        },
        error: (response) => {
          this.isCulqiSaving.set(false);
          this.culqiError.set(
            response?.error?.message || 'No se pudo guardar la configuración de Culqi.',
          );
        },
      });
  }

  loadYapeConfiguration(): void {
    this.isYapeLoading.set(true);
    this.yapeError.set(null);
    this.payments
      .getYapeConfiguration()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (configuration) => {
          this.yapeForm.reset(
            {
              enabled: configuration.enabled,
              phone: configuration.phone ?? '',
              accountName: configuration.accountName ?? '',
            },
            { emitEvent: false },
          );
          this.yapeQrImage.set(configuration.qrImageDataUrl ?? null);
          this.yapeForm.markAsPristine();
          this.isYapeLoading.set(false);
        },
        error: () => {
          this.isYapeLoading.set(false);
          this.yapeError.set('No se pudo cargar la configuración de Yape.');
        },
      });
  }

  selectYapeQr(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      this.yapeError.set('Selecciona una imagen PNG, JPG o WebP.');
      return;
    }
    if (file.size > 700_000) {
      this.yapeError.set('La imagen del QR debe pesar menos de 700 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : null;
      this.yapeQrImage.set(value);
      this.yapeForm.markAsDirty();
      this.yapeError.set(null);
    };
    reader.onerror = () => this.yapeError.set('No se pudo leer la imagen seleccionada.');
    reader.readAsDataURL(file);
  }

  removeYapeQr(): void {
    this.yapeQrImage.set(null);
    this.yapeForm.markAsDirty();
  }

  saveYapeConfiguration(): void {
    const value = this.yapeForm.getRawValue();
    const phone = value.phone.trim();
    const accountName = value.accountName.trim();
    if (value.enabled && (!phone || !accountName)) {
      this.yapeError.set('Ingresa el número y el nombre del titular para habilitar Yape.');
      this.yapeForm.markAllAsTouched();
      return;
    }
    if (this.yapeForm.invalid || this.isYapeSaving()) {
      this.yapeForm.markAllAsTouched();
      return;
    }
    this.isYapeSaving.set(true);
    this.yapeMessage.set(null);
    this.yapeError.set(null);
    this.payments
      .updateYapeConfiguration({
        enabled: value.enabled,
        phone: phone || undefined,
        accountName: accountName || undefined,
        qrImageDataUrl: this.yapeQrImage() ?? undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (configuration) => {
          this.isYapeSaving.set(false);
          this.yapeQrImage.set(configuration.qrImageDataUrl ?? null);
          this.yapeForm.markAsPristine();
          this.yapeMessage.set(
            configuration.enabled
              ? 'Yape quedó listo para recibir solicitudes de pago.'
              : 'El cobro directo por Yape quedó desactivado.',
          );
        },
        error: (response) => {
          this.isYapeSaving.set(false);
          this.yapeError.set(
            response?.error?.message || 'No se pudo guardar la configuración de Yape.',
          );
        },
      });
  }

  connectGoogle(): void {
    this.isGoogleLoading.set(true);
    this.integrationSavedMessage.set(null);
    this.googleError.set(null);
    this.googleIntegrationApi
      .createAuthorizationUrl()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ url }) => {
          try {
            const authorizationUrl = new URL(url);
            if (
              authorizationUrl.protocol !== 'https:' ||
              authorizationUrl.hostname !== 'accounts.google.com'
            ) {
              throw new Error('Unexpected Google authorization URL');
            }
            globalThis.location.assign(authorizationUrl.toString());
          } catch {
            this.isGoogleLoading.set(false);
            this.googleError.set('No se pudo iniciar la conexión segura con Google.');
          }
        },
        error: () => {
          this.isGoogleLoading.set(false);
          this.googleError.set('Google todavía no está configurado en el servidor.');
        },
      });
  }

  async disconnectGoogle(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Desvincular Google',
      message: 'Las citas dejarán de sincronizarse con Google Calendar. ¿Quieres continuar?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Desvincular', role: 'destructive' },
      ],
    });
    await alert.present();
    const result = await alert.onDidDismiss();
    if (result.role !== 'destructive') return;
    this.isGoogleLoading.set(true);
    this.googleError.set(null);
    this.googleIntegrationApi
      .disconnect()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (status) => {
          this.googleStatus.set(status);
          this.currentIntegration.set(IntegrationProvider.NONE);
          this.persistSettings({
            integrationProvider: IntegrationProvider.NONE,
            integrationSettings: this.integrationSettings(),
            enablePayments: this.enablePayments(),
          });
          this.integrationSavedMessage.set('La cuenta Google fue desvinculada correctamente.');
          this.isGoogleLoading.set(false);
        },
        error: () => {
          this.googleError.set('No se pudo desvincular la cuenta Google.');
          this.isGoogleLoading.set(false);
        },
      });
  }

  loadGoogleStatus(): void {
    this.isGoogleLoading.set(true);
    this.googleError.set(null);
    this.googleIntegrationApi
      .getStatus()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (status) => {
          this.googleStatus.set(status);
          if (status.connected) {
            this.currentIntegration.set(IntegrationProvider.GOOGLE);
          }
          this.isGoogleLoading.set(false);
        },
        error: () => {
          this.googleStatus.set({
            configured: false,
            connected: false,
            scopes: [],
          });
          this.isGoogleLoading.set(false);
          this.googleError.set('No se pudo consultar el estado de Google.');
        },
      });
  }

  private loadProfile(): void {
    const userId = this.authService.currentUser()?.userId;
    if (!userId) return;

    this.isProfileLoading.set(true);
    this.userApi
      .getUser(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.authService.updateCurrentUser(user);
          this.isProfileLoading.set(false);
        },
        error: () => this.isProfileLoading.set(false),
      });
  }

  private handleGoogleCallbackResult(): void {
    const result = this.route.snapshot.queryParamMap.get('google');
    if (!result) return;
    this.integrationSavedMessage.set(
      result === 'connected'
        ? 'Google se vinculó correctamente.'
        : 'Google no pudo vincularse. Inténtalo nuevamente.',
    );
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { google: null, reason: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  checkWhatsappStatus() {
    this.isPollingQr.set(true);
    this.whatsappError.set(null);
    this.whatsappQrError.set(null);
    this.whatsappApi
      .getStatus()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.whatsappStatus.set(res.status);
          if (res.status === 'WAITING_QR') {
            this.fetchWhatsappQr();
          } else {
            this.isPollingQr.set(false);
            this.whatsappQrImage.set(null);
          }
        },
        error: () => {
          this.isPollingQr.set(false);
          this.whatsappError.set('No se pudo consultar el estado de WhatsApp.');
        },
      });
  }

  async scrollToSection(sectionId: string): Promise<void> {
    const target = document.getElementById(sectionId);
    if (!target) return;
    this.activeSection.set(sectionId);

    const content = this.content();
    const scrollElement = await content.getScrollElement();
    const maxScrollTop = scrollElement.scrollHeight - scrollElement.clientHeight;
    const targetTop =
      scrollElement.scrollTop +
      target.getBoundingClientRect().top -
      scrollElement.getBoundingClientRect().top -
      16;

    await content.scrollToPoint(
      0,
      sectionId === 'payment-settings'
        ? maxScrollTop
        : Math.min(Math.max(targetTop, 0), maxScrollTop),
      300,
    );
  }

  private fetchWhatsappQr() {
    this.whatsappApi
      .getQrCode()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (res) => {
          if (res.qr) {
            try {
              const qrDataUrl = await QRCode.toDataURL(res.qr, { margin: 2, scale: 6 });
              this.whatsappQrImage.set(qrDataUrl);
            } catch (err) {
              console.error('Error rendering QR code', err);
              this.whatsappQrError.set('No se pudo generar la imagen del código QR.');
            }
          }
          this.isPollingQr.set(false);
        },
        error: () => {
          this.isPollingQr.set(false);
          this.whatsappQrError.set('No se pudo obtener el código QR.');
        },
      });
  }

  saveProfile() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const { firstName, lastName, email, phone } = this.profileForm.getRawValue();
    const profile = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
    };
    this.userApi
      .updateMyProfile(profile)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.authService.updateCurrentUser(user);
          this.profileForm.markAsPristine();
          const savedAt = new Date().toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
          });
          this.profileSavedMessage.set(`Perfil actualizado a las ${savedAt}.`);
        },
        error: () => this.profileSavedMessage.set('No se pudo actualizar el perfil.'),
      });
  }

  setIntegration(event: Event) {
    const nextIntegration = this.getEventValue<IntegrationProvider>(event);
    if (!nextIntegration) return;
    this.selectIntegration(nextIntegration);
  }

  selectIntegration(provider: IntegrationProvider): void {
    if (!VALID_INTEGRATION_PROVIDERS.has(provider)) return;
    if (provider === IntegrationProvider.MICROSOFT) return;
    this.currentIntegration.set(provider);
    this.integrationSavedMessage.set(null);
  }

  updateIntegrationSetting(setting: IntegrationPreference, event: Event) {
    const isEnabled = Boolean((event as CustomEvent<{ checked?: boolean }>).detail?.checked);
    this.integrationSettings.update((current) => ({
      ...current,
      [setting]: isEnabled,
    }));
  }

  updatePaymentSetting(event: Event) {
    const isEnabled = Boolean((event as CustomEvent<{ checked?: boolean }>).detail?.checked);
    this.enablePayments.set(isEnabled);
    this.saveIntegration();
  }

  saveIntegration() {
    if (this.isSavingIntegration()) return;
    const provider = this.currentIntegration();
    const savedAt = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const settingsObj = {
      integrationProvider: provider,
      integrationSettings: this.integrationSettings(),
      enablePayments: this.enablePayments(),
    };

    this.isSavingIntegration.set(true);
    this.integrationSavedMessage.set(null);
    this.integrationErrorMessage.set(null);
    this.userApi
      .updateMySettings({
        integrationProvider: settingsObj.integrationProvider,
        syncCalendar: settingsObj.integrationSettings.syncCalendar,
        syncContacts: settingsObj.integrationSettings.syncContacts,
        sendDailyDigest: settingsObj.integrationSettings.sendDailyDigest,
        paymentEnabled: settingsObj.enablePayments,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.persistSettings(settingsObj);
          this.lastPersistedSettings = settingsObj;
          this.isSavingIntegration.set(false);
          if (provider === IntegrationProvider.NONE) {
            this.integrationSavedMessage.set(`Integración desactivada a las ${savedAt}.`);
            return;
          }

          const providerLabel = provider === IntegrationProvider.GOOGLE ? 'Google' : 'Microsoft';
          this.integrationSavedMessage.set(
            `Configuración de ${providerLabel} y pagos guardada a las ${savedAt}.`,
          );
        },
        error: () => {
          this.currentIntegration.set(this.lastPersistedSettings.integrationProvider);
          this.integrationSettings.set(this.lastPersistedSettings.integrationSettings);
          this.enablePayments.set(this.lastPersistedSettings.enablePayments);
          this.isSavingIntegration.set(false);
          this.integrationErrorMessage.set(
            'No se pudieron guardar los ajustes. Se restauró la última configuración guardada.',
          );
        },
      });
  }

  private getEventValue<T>(event: Event): T | null {
    const value = (event as CustomEvent<{ value?: T }>).detail?.value;
    return value ?? null;
  }

  private loadStoredSettings(): IUserSettingsStorage {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) {
        return {
          integrationProvider: IntegrationProvider.NONE,
          integrationSettings: DEFAULT_INTEGRATION_SETTINGS,
          enablePayments: false,
        };
      }

      const parsed = JSON.parse(raw) as Partial<IUserSettingsStorage>;
      const integrationProvider = parsed.integrationProvider;
      const validProvider =
        integrationProvider &&
        integrationProvider !== IntegrationProvider.MICROSOFT &&
        VALID_INTEGRATION_PROVIDERS.has(integrationProvider)
          ? integrationProvider
          : IntegrationProvider.NONE;

      return {
        integrationProvider: validProvider,
        integrationSettings: {
          ...DEFAULT_INTEGRATION_SETTINGS,
          ...parsed.integrationSettings,
        },
        enablePayments: parsed.enablePayments ?? false,
      };
    } catch {
      return {
        integrationProvider: IntegrationProvider.NONE,
        integrationSettings: DEFAULT_INTEGRATION_SETTINGS,
        enablePayments: false,
      };
    }
  }

  private persistSettings(settings: IUserSettingsStorage): void {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }
}
