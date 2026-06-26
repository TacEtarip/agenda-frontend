import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface IUpdateSettingsPayload {
  integrationProvider?: string;
  syncCalendar?: boolean;
  syncContacts?: boolean;
  sendDailyDigest?: boolean;
  paymentEnabled?: boolean;
}

@Injectable({ providedIn: 'root' })
export class UserApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  updateMySettings(payload: IUpdateSettingsPayload): Observable<any> {
    return this.http.patch(`${this.baseUrl}/me/settings`, payload);
  }
}
