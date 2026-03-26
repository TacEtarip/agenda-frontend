import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { INote } from '../../interfaces/note.interface';
import { ICreateNotePayload } from '../interfaces/create-note-payload.interface';
import { IUpdateNotePayload } from '../interfaces/update-note-payload.interface';

@Injectable({ providedIn: 'root' })
export class NoteApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/notes`;

  getAllByClient(clientId: string): Observable<INote[]> {
    return this.http.get<INote[]>(`${this.url}/client/${clientId}`);
  }

  create(payload: ICreateNotePayload): Observable<INote> {
    return this.http.post<INote>(this.url, payload);
  }

  update(id: string, payload: IUpdateNotePayload): Observable<INote> {
    return this.http.put<INote>(`${this.url}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
