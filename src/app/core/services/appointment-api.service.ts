import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IAppointmentApi } from '../interfaces/appointment-api.interface';
import { ICreateAppointmentPayload } from '../interfaces/create-appointment-payload.interface';
import { IUpdateAppointmentPayload } from '../interfaces/update-appointment-payload.interface';
import {
  IAppointmentAvailabilityApi,
  ICheckAppointmentAvailabilityPayload,
} from '../interfaces/appointment-availability-api.interface';

@Injectable({ providedIn: 'root' })
export class AppointmentApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/appointments`;

  getAll(): Observable<IAppointmentApi[]> {
    return this.http.get<IAppointmentApi[]>(this.url);
  }

  getAllByClient(clientId: string): Observable<IAppointmentApi[]> {
    return this.http.get<IAppointmentApi[]>(`${this.url}/client/${clientId}`);
  }

  checkAvailability(
    payload: ICheckAppointmentAvailabilityPayload,
  ): Observable<IAppointmentAvailabilityApi> {
    return this.http.post<IAppointmentAvailabilityApi>(`${this.url}/availability`, payload);
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

  retryCalendarSync(id: string): Observable<IAppointmentApi> {
    return this.http.post<IAppointmentApi>(`${this.url}/${id}/calendar-sync/retry`, {});
  }
}
