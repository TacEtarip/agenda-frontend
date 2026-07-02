import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TOKEN_KEY, USER_KEY } from '../constants/auth-storage.constants';
import { AuthService } from './auth.service';

describe('AuthService registration', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      ],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('creates the account without starting a session', async () => {
    const response = firstValueFrom(
      service.register(
        'Agenda Test',
        'Ada',
        'Lovelace',
        '+51987654321',
        'ada@example.test',
        'password123',
      ),
    );

    const request = http.expectOne('http://localhost:3000/auth/register-company');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      companyName: 'Agenda Test',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: '+51987654321',
      email: 'ada@example.test',
      password: 'password123',
    });
    request.flush({ accessToken: 'registration-token-must-not-be-persisted' });

    await response;
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });
});
