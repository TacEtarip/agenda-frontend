export interface IGoogleIntegrationStatus {
  configured: boolean;
  connected: boolean;
  email?: string;
  scopes: string[];
  expiresAt?: string;
}
