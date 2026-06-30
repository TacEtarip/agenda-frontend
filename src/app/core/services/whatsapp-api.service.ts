import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IWhatsAppStatusResponse } from '../interfaces/whatsapp-status-response.interface';
import { IWhatsAppQrResponse } from '../interfaces/whatsapp-qr-response.interface';

@Injectable({ providedIn: 'root' })
export class WhatsAppApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/whatsapp`;

  getStatus(): Observable<IWhatsAppStatusResponse> {
    return this.http.get<IWhatsAppStatusResponse>(`${this.baseUrl}/status`);
  }

  getQrCode(): Observable<IWhatsAppQrResponse> {
    return this.http.get<IWhatsAppQrResponse>(`${this.baseUrl}/qr`);
  }
}
