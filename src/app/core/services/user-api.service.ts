import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IUpdateSettingsPayload } from '../interfaces/update-settings-payload.interface';
import { IAuthUser } from '../interfaces/auth-user.interface';

@Injectable({ providedIn: 'root' })
export class UserApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  updateMySettings(payload: IUpdateSettingsPayload): Observable<any> {
    return this.http.patch(`${this.baseUrl}/me/settings`, payload);
  }

  getUser(id: string): Observable<IAuthUser> {
    return this.http.get<IAuthUser>(`${this.baseUrl}/${id}`);
  }

  updateMyProfile(payload: Pick<IAuthUser, 'firstName' | 'lastName' | 'email' | 'phone'>): Observable<IAuthUser> {
    return this.http.patch<IAuthUser>(`${this.baseUrl}/me/profile`, payload);
  }
}
