import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type MessagingStatus = 'CONNECTED' | 'DISCONNECTED' | 'WAITING_QR' | 'INITIALIZING';

export interface WhatsAppStatusResponse {
  status: MessagingStatus;
}

export interface WhatsAppQrResponse {
  qr: string | null;
}

@Injectable({ providedIn: 'root' })
export class WhatsAppApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/whatsapp`;

  getStatus(): Observable<WhatsAppStatusResponse> {
    return this.http.get<WhatsAppStatusResponse>(`${this.baseUrl}/status`);
  }

  getQrCode(): Observable<WhatsAppQrResponse> {
    return this.http.get<WhatsAppQrResponse>(`${this.baseUrl}/qr`);
  }
}
