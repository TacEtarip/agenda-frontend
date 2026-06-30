export interface IUpdateSettingsPayload {
  integrationProvider?: string;
  syncCalendar?: boolean;
  syncContacts?: boolean;
  sendDailyDigest?: boolean;
  paymentEnabled?: boolean;
}
