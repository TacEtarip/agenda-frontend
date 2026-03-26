import { IntegrationProvider } from '../enums/integration-provider.enum';
import { IIntegrationSettings } from '../interfaces/integration-settings.interface';

export const SETTINGS_STORAGE_KEY = 'agenda_user_settings';

export const VALID_INTEGRATION_PROVIDERS = new Set<IntegrationProvider>([
  IntegrationProvider.NONE,
  IntegrationProvider.GOOGLE,
  IntegrationProvider.MICROSOFT,
]);

export const DEFAULT_INTEGRATION_SETTINGS: IIntegrationSettings = {
  syncCalendar: true,
  syncContacts: false,
  sendDailyDigest: true,
};
