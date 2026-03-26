import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { IClient } from '../../interfaces/client.interface';
import { AVATAR_COLORS } from '../constants/avatar-colors.constants';
import { IClientApiResponse } from '../interfaces/client-api-response.interface';
import { ICreateClientPayload } from '../interfaces/create-client-payload.interface';
import { IUpdateClientPayload } from '../interfaces/update-client-payload.interface';

function mapApiClientToIClient(c: IClientApiResponse, index = 0): IClient {
  return {
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email ?? '',
    phone: c.phoneNumber,
    stage: c.stage,
    initials: `${c.firstName[0] ?? ''}${c.lastName[0] ?? ''}`.toUpperCase(),
    color: AVATAR_COLORS[index % AVATAR_COLORS.length],
    createdAt: new Date(c.createdAt).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
  };
}

@Injectable({ providedIn: 'root' })
export class ClientApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/clients`;

  getAllByUser(userId: string): Observable<IClient[]> {
    return this.http
      .get<IClientApiResponse[]>(`${this.url}/user/${userId}`)
      .pipe(map((list) => list.map((c, i) => mapApiClientToIClient(c, i))));
  }

  getById(id: string): Observable<IClient> {
    return this.http
      .get<IClientApiResponse>(`${this.url}/${id}`)
      .pipe(map((c) => mapApiClientToIClient(c)));
  }

  create(payload: ICreateClientPayload): Observable<{ message: string; client: IClient }> {
    return this.http
      .post<{ message: string; client: IClientApiResponse }>(this.url, payload)
      .pipe(map((r) => ({ message: r.message, client: mapApiClientToIClient(r.client) })));
  }

  update(id: string, payload: IUpdateClientPayload): Observable<{ message: string; client: IClient }> {
    return this.http
      .put<{ message: string; client: IClientApiResponse }>(`${this.url}/${id}`, payload)
      .pipe(map((r) => ({ message: r.message, client: mapApiClientToIClient(r.client) })));
  }

  remove(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.url}/${id}`);
  }
}
