import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IAppointmentApi } from '../interfaces/appointment-api.interface';
import { ICreateAppointmentPayload } from '../interfaces/create-appointment-payload.interface';
import { IUpdateAppointmentPayload } from '../interfaces/update-appointment-payload.interface';

@Injectable({ providedIn: 'root' })
export class AppointmentApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/appointments`;

  getAllByUser(userId: string): Observable<IAppointmentApi[]> {
    return this.http.get<IAppointmentApi[]>(`${this.url}/user/${userId}`);
  }

  getAllByClient(clientId: string): Observable<IAppointmentApi[]> {
    return this.http.get<IAppointmentApi[]>(`${this.url}/client/${clientId}`);
  }

  create(payload: ICreateAppointmentPayload): Observable<IAppointmentApi> {
    return this.http.post<IAppointmentApi>(this.url, payload);
  }

  update(id: string, payload: IUpdateAppointmentPayload): Observable<IAppointmentApi> {
    return this.http.put<IAppointmentApi>(`${this.url}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
