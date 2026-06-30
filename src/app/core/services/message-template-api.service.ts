import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IMessageTemplate } from '../../interfaces/message-template.interface';
import { ICreateTemplatePayload } from '../interfaces/create-template-payload.interface';
import { IUpdateTemplatePayload } from '../interfaces/update-template-payload.interface';
import { ClientStage } from '../../enums/client-stage.enum';
import { TemplatePreviewResult, TemplateVariableMetadata } from '../../interfaces/template-variable.interface';

@Injectable({ providedIn: 'root' })
export class MessageTemplateApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/message-templates`;

  getAll(): Observable<IMessageTemplate[]> {
    return this.http.get<IMessageTemplate[]>(this.url);
  }

  getMetadata(): Observable<{ variables: TemplateVariableMetadata[] }> {
    return this.http.get<{ variables: TemplateVariableMetadata[] }>(`${this.url}/metadata`);
  }

  preview(stage: ClientStage, messageBody: string): Observable<TemplatePreviewResult> {
    return this.http.post<TemplatePreviewResult>(`${this.url}/preview`, { stage, messageBody });
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
