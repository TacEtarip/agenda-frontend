import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IMessageTemplate } from '../../interfaces/message-template.interface';
import { ICreateTemplatePayload } from '../interfaces/create-template-payload.interface';
import { IUpdateTemplatePayload } from '../interfaces/update-template-payload.interface';

@Injectable({ providedIn: 'root' })
export class MessageTemplateApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/message-templates`;

  getAllByUser(userId: string): Observable<IMessageTemplate[]> {
    return this.http.get<IMessageTemplate[]>(`${this.url}/user/${userId}`);
  }

  create(payload: ICreateTemplatePayload): Observable<IMessageTemplate> {
    return this.http.post<IMessageTemplate>(this.url, payload);
  }

  update(id: string, payload: IUpdateTemplatePayload): Observable<IMessageTemplate> {
    return this.http.put<IMessageTemplate>(`${this.url}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
