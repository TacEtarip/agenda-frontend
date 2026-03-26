import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IClientProduct } from '../../interfaces/client-product.interface';
import { ICreateClientProductPayload } from '../interfaces/create-client-product-payload.interface';
import { IUpdateClientProductPayload } from '../interfaces/update-client-product-payload.interface';

@Injectable({ providedIn: 'root' })
export class ClientProductApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/client-products`;

  getAllByClient(clientId: string): Observable<IClientProduct[]> {
    return this.http.get<IClientProduct[]>(`${this.url}/client/${clientId}`);
  }

  create(payload: ICreateClientProductPayload): Observable<IClientProduct> {
    return this.http.post<IClientProduct>(this.url, payload);
  }

  update(id: string, payload: IUpdateClientProductPayload): Observable<IClientProduct> {
    return this.http.put<IClientProduct>(`${this.url}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
