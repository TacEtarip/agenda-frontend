import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IGoogleIntegrationStatus } from '../interfaces/google-integration-status.interface';

@Injectable({ providedIn: 'root' })
export class GoogleIntegrationApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/integrations/google`;

  getStatus(): Observable<IGoogleIntegrationStatus> {
    return this.http.get<IGoogleIntegrationStatus>(`${this.url}/status`);
  }

  createAuthorizationUrl(): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(`${this.url}/authorization-url`, {});
  }

  disconnect(): Observable<IGoogleIntegrationStatus> {
    return this.http.delete<IGoogleIntegrationStatus>(this.url);
  }
}
