import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IProduct } from '../../interfaces/product.interface';
import { ICreateProductPayload } from '../interfaces/create-product-payload.interface';
import { IUpdateProductPayload } from '../interfaces/update-product-payload.interface';

@Injectable({ providedIn: 'root' })
export class ProductApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/products`;

  getAllByUser(userId: string): Observable<IProduct[]> {
    return this.http.get<IProduct[]>(`${this.url}/user/${userId}`);
  }

  create(payload: ICreateProductPayload): Observable<IProduct> {
    return this.http.post<IProduct>(this.url, payload);
  }

  update(id: string, payload: IUpdateProductPayload): Observable<IProduct> {
    return this.http.put<IProduct>(`${this.url}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
