export interface IAuthUser {
  userId: string;
  companyId: string;
  email: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  onboardingCompleted?: boolean;
}
