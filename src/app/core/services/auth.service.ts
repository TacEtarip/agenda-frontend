import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IAuthUser } from '../interfaces/auth-user.interface';
import { ILoginResponse } from '../interfaces/login-response.interface';
import { TOKEN_KEY, USER_KEY } from '../constants/auth-storage.constants';
import { TenantSessionStateService } from './tenant-session-state.service';

export interface ICompanyRegistration {
  companyName: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  yapeEnabled?: boolean;
  yapePhone?: string;
  yapeAccountName?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tenantSessionState = inject(TenantSessionStateService);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  private readonly _token = signal<string | null>(null);
  private readonly _currentUser = signal<IAuthUser | null>(null);

  readonly isAuthenticated = computed(() => !!this._token());
  readonly currentUser = this._currentUser.asReadonly();
  readonly token = this._token.asReadonly();

  constructor() {
    this._restoreSession();
  }

  hasValidSession(): boolean {
    const token = this._token() ?? localStorage.getItem(TOKEN_KEY);
    const user = token ? this._decodeToken(token) : null;

    if (!token || !user) {
      this.clearSession();
      return false;
    }

    this._token.set(token);
    this._currentUser.set(user);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return true;
  }

  login(email: string, password: string): Observable<ILoginResponse> {
    return this.http
      .post<ILoginResponse>(`${this.baseUrl}/login`, { email, password })
      .pipe(tap((res) => this._persist(res)));
  }

  register(input: ICompanyRegistration): Observable<ILoginResponse> {
    return this.http.post<ILoginResponse>(`${this.baseUrl}/register-company`, {
      companyName: input.companyName,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone.trim(),
      email: input.email,
      password: input.password,
      ...(input.yapeEnabled
        ? {
            yapeEnabled: true,
            yapePhone: input.yapePhone?.trim(),
            yapeAccountName: input.yapeAccountName?.trim(),
          }
        : {}),
    });
  }

  logout(): void {
    this.clearSession();
    void this.router.navigate(['/login']);
  }

  clearSession(): void {
    this.tenantSessionState.invalidate();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._currentUser.set(null);
  }

  updateCurrentUser(userPatch: Partial<IAuthUser>): void {
    const currentUser = this._currentUser();
    if (!currentUser) return;

    const nextUser: IAuthUser = {
      ...currentUser,
      ...userPatch,
      userId: currentUser.userId,
    };

    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    this._currentUser.set(nextUser);
  }

  private _persist(res: ILoginResponse): void {
    const user = this._decodeToken(res.accessToken);
    if (!user) {
      this.clearSession();
      return;
    }

    this.tenantSessionState.invalidate();
    localStorage.setItem(TOKEN_KEY, res.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this._token.set(res.accessToken);
    this._currentUser.set(user);
  }

  private _decodeToken(token: string): IAuthUser | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3 || !parts.every(Boolean)) return null;

      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const payload = JSON.parse(atob(padded)) as {
        sub?: string;
        email?: string;
        companyId?: string;
        companyName?: string;
        exp?: number;
      };
      if (
        !payload.sub ||
        !payload.companyId ||
        typeof payload.exp !== 'number' ||
        payload.exp <= Math.floor(Date.now() / 1000)
      ) {
        return null;
      }
      return {
        userId: payload.sub,
        companyId: payload.companyId,
        email: payload.email ?? '',
        companyName: payload.companyName,
      };
    } catch {
      return null;
    }
  }

  private _restoreSession(): void {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = token ? this._decodeToken(token) : null;

    if (!token || !user) {
      this.clearSession();
      return;
    }

    this._token.set(token);
    this._currentUser.set(user);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}
