import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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

type IntegrationProvider = 'none' | 'google' | 'microsoft';

const VALID_INTEGRATION_PROVIDERS = new Set<IntegrationProvider>(['none', 'google', 'microsoft']);
type IntegrationPreference = 'syncCalendar' | 'syncContacts' | 'sendDailyDigest';

interface IIntegrationSettings {
  syncCalendar: boolean;
  syncContacts: boolean;
  sendDailyDigest: boolean;
}

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
  private readonly fb = inject(FormBuilder);

  readonly profileForm = this.fb.nonNullable.group({
    firstName: ['Alex', [Validators.required, Validators.maxLength(60)]],
    lastName: ['Johnson', [Validators.required, Validators.maxLength(60)]],
    email: ['alex.johnson@example.com', [Validators.required, Validators.email]],
    phone: ['+1 202 555 0145'],
  });

  readonly currentIntegration = signal<IntegrationProvider>('none');
  readonly integrationSettings = signal<IIntegrationSettings>({
    syncCalendar: true,
    syncContacts: false,
    sendDailyDigest: true,
  });

  readonly profileSavedMessage = signal<string | null>(null);
  readonly integrationSavedMessage = signal<string | null>(null);

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
  }

  saveProfile() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.profileForm.markAsPristine();
    const savedAt = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
    this.profileSavedMessage.set(`Perfil actualizado a las ${savedAt}.`);
  }

  setIntegration(event: CustomEvent<{ value: IntegrationProvider }>) {
    const nextIntegration = event.detail.value;
    if (!VALID_INTEGRATION_PROVIDERS.has(nextIntegration)) return;
    this.currentIntegration.set(nextIntegration);
    this.integrationSavedMessage.set(null);
  }

  updateIntegrationSetting(
    setting: IntegrationPreference,
    event: CustomEvent<{ checked: boolean }>,
  ) {
    const isEnabled = Boolean(event.detail.checked);
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

    if (provider === 'none') {
      this.integrationSavedMessage.set(`Integración desactivada a las ${savedAt}.`);
      return;
    }

    const providerLabel = provider === 'google' ? 'Google' : 'Microsoft';
    this.integrationSavedMessage.set(
      `Configuración de ${providerLabel} guardada a las ${savedAt}.`,
    );
  }

  integrationTitle(provider: IntegrationProvider): string {
    if (provider === 'google') return 'Google Workspace';
    if (provider === 'microsoft') return 'Microsoft 365';
    return 'Sin integración';
  }

  integrationDescription(provider: IntegrationProvider): string {
    if (provider === 'google') {
      return 'Sincroniza calendario y contactos de Google.';
    }

    if (provider === 'microsoft') {
      return 'Sincroniza calendario y contactos de Microsoft 365.';
    }

    return 'Modo local: no se sincroniza información externa.';
  }
}
