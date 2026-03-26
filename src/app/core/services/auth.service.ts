import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IAuthUser } from '../interfaces/auth-user.interface';
import { ILoginResponse } from '../interfaces/login-response.interface';
import { TOKEN_KEY, USER_KEY } from '../constants/auth-storage.constants';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  private readonly _token = signal<string | null>(
    localStorage.getItem(TOKEN_KEY),
  );
  private readonly _currentUser = signal<IAuthUser | null>(
    this._loadUserFromStorage(),
  );

  readonly isAuthenticated = computed(() => !!this._token());
  readonly currentUser = this._currentUser.asReadonly();
  readonly token = this._token.asReadonly();

  login(email: string, password: string): Observable<ILoginResponse> {
    return this.http
      .post<ILoginResponse>(`${this.baseUrl}/login`, { email, password })
      .pipe(tap((res) => this._persist(res)));
  }

  register(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
  ): Observable<ILoginResponse> {
    return this.http
      .post<ILoginResponse>(`${this.baseUrl}/register`, {
        firstName,
        lastName,
        email,
        password,
      })
      .pipe(tap((res) => this._persist(res)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._currentUser.set(null);
    void this.router.navigate(['/login']);
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
    localStorage.setItem(TOKEN_KEY, res.accessToken);
    this._token.set(res.accessToken);
    const user = this._decodeToken(res.accessToken);
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      this._currentUser.set(user);
    }
  }

  private _decodeToken(token: string): IAuthUser | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as {
        sub?: string;
        email?: string;
      };
      if (!payload.sub) return null;
      return { userId: payload.sub, email: payload.email ?? '' };
    } catch {
      return null;
    }
  }

  private _loadUserFromStorage(): IAuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as IAuthUser) : null;
    } catch {
      return null;
    }
  }
}


