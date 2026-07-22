import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { UserApiService } from './user-api.service';

export type OnboardingMode = 'first-run' | 'replay';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly users = inject(UserApiService);
  private readonly auth = inject(AuthService);
  private initializedUserId: string | null = null;
  private requestVersion = 0;

  private readonly _isOpen = signal(false);
  private readonly _mode = signal<OnboardingMode>('first-run');
  private readonly _isSaving = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly isOpen = this._isOpen.asReadonly();
  readonly mode = this._mode.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly error = this._error.asReadonly();

  async initialize(userId: string): Promise<void> {
    if (!userId || this.initializedUserId === userId) return;

    this.initializedUserId = userId;
    const requestVersion = ++this.requestVersion;

    try {
      const user = await firstValueFrom(this.users.getUser(userId));
      if (requestVersion !== this.requestVersion || this.initializedUserId !== userId) return;

      this.auth.updateCurrentUser(user);
      if (!user.onboardingCompleted) {
        this._mode.set('first-run');
        this._error.set(null);
        this._isOpen.set(true);
      }
    } catch {
      // Authentication still works if the profile request is temporarily unavailable.
      // The guide can always be launched manually from the user menu.
      if (requestVersion === this.requestVersion) this.initializedUserId = null;
    }
  }

  openReplay(): void {
    this._mode.set('replay');
    this._error.set(null);
    this._isOpen.set(true);
  }

  closeReplay(): void {
    if (this._mode() !== 'replay') return;
    this._isOpen.set(false);
    this._error.set(null);
  }

  async finish(): Promise<boolean> {
    if (this._mode() === 'replay') {
      this.closeReplay();
      return true;
    }
    if (this._isSaving()) return false;

    this._isSaving.set(true);
    this._error.set(null);
    try {
      await firstValueFrom(this.users.updateMySettings({ onboardingCompleted: true }));
      this.auth.updateCurrentUser({ onboardingCompleted: true });
      this._isOpen.set(false);
      return true;
    } catch {
      this._error.set('No pudimos guardar tu avance. Revisa tu conexión e inténtalo nuevamente.');
      return false;
    } finally {
      this._isSaving.set(false);
    }
  }
}
