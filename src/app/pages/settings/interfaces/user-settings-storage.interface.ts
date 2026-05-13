import { IntegrationProvider } from '../enums/integration-provider.enum';
import { IIntegrationSettings } from './integration-settings.interface';

export interface IUserSettingsStorage {
  integrationProvider: IntegrationProvider;
  integrationSettings: IIntegrationSettings;
  enablePayments: boolean;
  paymentGatewayKey: string;
}
