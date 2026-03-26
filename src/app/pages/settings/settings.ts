import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { COMMON_ION_PAGE_IMPORTS } from '../../shared/ionic-imports';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  calendarClearOutline,
  checkmarkCircleOutline,
  informationCircleOutline,
  logoGoogle,
  logoMicrosoft,
  notificationsOutline,
  personCircleOutline,
  settingsOutline,
  syncOutline,
} from 'ionicons/icons';
import {
  IonBackButton,
  IonInput,
  IonRadio,
  IonRadioGroup,
  IonToggle,
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';
import { IntegrationProvider } from './enums/integration-provider.enum';
import { IntegrationPreference } from './enums/integration-preference.enum';
import { IIntegrationSettings } from './interfaces/integration-settings.interface';
import { IUserSettingsStorage } from './interfaces/user-settings-storage.interface';
import {
  DEFAULT_INTEGRATION_SETTINGS,
  SETTINGS_STORAGE_KEY,
  VALID_INTEGRATION_PROVIDERS,
} from './constants/settings.constants';

@Component({
  selector: 'app-settings',
  host: { class: 'ion-page' },
  imports: [
    ReactiveFormsModule,
    ...COMMON_ION_PAGE_IMPORTS,
    IonBackButton,
    IonInput,
    IonRadioGroup,
    IonRadio,
    IonToggle,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  readonly IntegrationPreference = IntegrationPreference;

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
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

  readonly profileSavedMessage = signal<string | null>(null);
  readonly integrationSavedMessage = signal<string | null>(null);
  readonly integrationTitle = computed(() => {
    const provider = this.currentIntegration();
    if (provider === IntegrationProvider.GOOGLE) return 'Google Workspace';
    if (provider === IntegrationProvider.MICROSOFT) return 'Microsoft 365';
    return 'Sin integración';
  });
  readonly integrationDescription = computed(() => {
    const provider = this.currentIntegration();
    if (provider === IntegrationProvider.GOOGLE) {
      return 'Sincroniza calendario y contactos de Google.';
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
      notificationsOutline,
      personCircleOutline,
      settingsOutline,
      syncOutline,
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
  }

  saveProfile() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const { firstName, lastName, email, phone } = this.profileForm.getRawValue();
    this.authService.updateCurrentUser({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
    });

    this.profileForm.markAsPristine();
    const savedAt = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
    this.profileSavedMessage.set(`Perfil actualizado a las ${savedAt}.`);
  }

  setIntegration(event: Event) {
    const nextIntegration = this.getEventValue<IntegrationProvider>(event);
    if (!nextIntegration) return;
    if (!VALID_INTEGRATION_PROVIDERS.has(nextIntegration)) return;
    this.currentIntegration.set(nextIntegration);
    this.integrationSavedMessage.set(null);
  }

  updateIntegrationSetting(setting: IntegrationPreference, event: Event) {
    const isEnabled = Boolean((event as CustomEvent<{ checked?: boolean }>).detail?.checked);
    this.integrationSettings.update((current) => ({
      ...current,
      [setting]: isEnabled,
    }));
  }

  saveIntegration() {
    const provider = this.currentIntegration();
    const savedAt = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });

    this.persistSettings({
      integrationProvider: provider,
      integrationSettings: this.integrationSettings(),
    });

    if (provider === IntegrationProvider.NONE) {
      this.integrationSavedMessage.set(`Integración desactivada a las ${savedAt}.`);
      return;
    }

    const providerLabel = provider === IntegrationProvider.GOOGLE ? 'Google' : 'Microsoft';
    this.integrationSavedMessage.set(
      `Configuración de ${providerLabel} guardada a las ${savedAt}.`,
    );
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
      };
    } catch {
      return {
        integrationProvider: IntegrationProvider.NONE,
        integrationSettings: DEFAULT_INTEGRATION_SETTINGS,
      };
    }
  }

  private persistSettings(settings: IUserSettingsStorage): void {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }
}
