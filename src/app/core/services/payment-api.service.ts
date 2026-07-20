import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaymentSourceType } from '../../enums/payment-source-type.enum';
import { IPayment } from '../../interfaces/payment.interface';
import { IPaymentListResult } from '../../interfaces/payment-list-result.interface';
import { ICreatePaymentLinkPayload } from '../../interfaces/create-payment-link-payload.interface';
import { IRegisterManualPaymentPayload } from '../../interfaces/register-manual-payment-payload.interface';
import { IYapeConfiguration } from '../../interfaces/yape-configuration.interface';
import { IPaymentListFilters } from '../interfaces/payment-list-filters.interface';

@Injectable({ providedIn: 'root' })
export class PaymentApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/payments`;

  list(filters: IPaymentListFilters = {}): Observable<IPaymentListResult> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '')
        params = params.set(key, String(value));
    });
    return this.http.get<IPaymentListResult>(this.url, { params });
  }

  history(sourceType: PaymentSourceType, sourceId: string): Observable<IPayment[]> {
    return this.http.get<IPayment[]>(`${this.url}/source/${sourceType}/${sourceId}`);
  }

  createLink(payload: ICreatePaymentLinkPayload): Observable<IPayment> {
    return this.http.post<IPayment>(`${this.url}/links`, payload);
  }

  getYapeConfiguration(): Observable<IYapeConfiguration> {
    return this.http.get<IYapeConfiguration>(`${this.url}/configuration/yape`);
  }

  updateYapeConfiguration(configuration: IYapeConfiguration): Observable<IYapeConfiguration> {
    return this.http.patch<IYapeConfiguration>(`${this.url}/configuration/yape`, configuration);
  }

  createYapeRequest(payload: ICreatePaymentLinkPayload): Observable<IPayment> {
    return this.http.post<IPayment>(`${this.url}/yape-requests`, payload);
  }

  confirmYape(id: string, reference?: string): Observable<IPayment> {
    return this.http.post<IPayment>(`${this.url}/${id}/confirm-yape`, {
      reference,
    });
  }

  registerManual(payload: IRegisterManualPaymentPayload): Observable<IPayment> {
    return this.http.post<IPayment>(`${this.url}/manual`, payload);
  }

  cancel(id: string): Observable<IPayment> {
    return this.http.post<IPayment>(`${this.url}/${id}/cancel`, {});
  }
}
