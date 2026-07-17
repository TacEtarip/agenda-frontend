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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly storedSettings = this.loadStoredSettings();

  readonly profileForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(60)]],
    lastName: ['', [Validators.required, Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
  });

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
  readonly googleStatus = signal<IGoogleIntegrationStatus>({
    configured: false,
    connected: false,
    scopes: [],
  });
  readonly isGoogleLoading = signal(false);

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
  }

  connectGoogle(): void {
    this.isGoogleLoading.set(true);
    this.integrationSavedMessage.set(null);
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
            this.integrationSavedMessage.set('No se pudo iniciar la conexión segura con Google.');
          }
        },
        error: () => {
          this.isGoogleLoading.set(false);
          this.integrationSavedMessage.set('Google todavía no está configurado en el servidor.');
        },
      });
  }

  disconnectGoogle(): void {
    this.isGoogleLoading.set(true);
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
          this.integrationSavedMessage.set('No se pudo desvincular la cuenta Google.');
          this.isGoogleLoading.set(false);
        },
      });
  }

  loadGoogleStatus(): void {
    this.isGoogleLoading.set(true);
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
        error: () => this.isPollingQr.set(false),
      });
  }

  async scrollToSection(sectionId: string): Promise<void> {
    const target = document.getElementById(sectionId);
    if (!target) return;

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
            }
          }
          this.isPollingQr.set(false);
        },
        error: () => this.isPollingQr.set(false),
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
    this.saveIntegration(); // Reuse to auto-save or call persistSettings
  }

  saveIntegration() {
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

    this.persistSettings(settingsObj);

    // Call Backend
    this.userApi
      .updateMySettings({
        integrationProvider: settingsObj.integrationProvider,
        syncCalendar: settingsObj.integrationSettings.syncCalendar,
        syncContacts: settingsObj.integrationSettings.syncContacts,
        sendDailyDigest: settingsObj.integrationSettings.sendDailyDigest,
        paymentEnabled: settingsObj.enablePayments,
      })
      .subscribe({
        next: () => {
          if (provider === IntegrationProvider.NONE) {
            this.integrationSavedMessage.set(`Integración desactivada a las ${savedAt}.`);
            return;
          }

          const providerLabel = provider === IntegrationProvider.GOOGLE ? 'Google' : 'Microsoft';
          this.integrationSavedMessage.set(
            `Configuración de ${providerLabel} y pagos guardada a las ${savedAt}.`,
          );
        },
        error: (err) => {
          console.error('Failed to sync settings with backend', err);
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
        integrationProvider && VALID_INTEGRATION_PROVIDERS.has(integrationProvider)
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
