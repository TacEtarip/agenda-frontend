import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { GoogleIntegrationApiService } from './google-integration-api.service';

describe('GoogleIntegrationApiService', () => {
  let service: GoogleIntegrationApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GoogleIntegrationApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the current Google connection status', async () => {
    const response = firstValueFrom(service.getStatus());
    const request = http.expectOne('http://localhost:3000/integrations/google/status');
    expect(request.request.method).toBe('GET');
    request.flush({ configured: true, connected: false, scopes: [] });

    await expect(response).resolves.toEqual({
      configured: true,
      connected: false,
      scopes: [],
    });
  });

  it('requests an authorization URL from the backend', async () => {
    const response = firstValueFrom(service.createAuthorizationUrl());
    const request = http.expectOne('http://localhost:3000/integrations/google/authorization-url');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({ url: 'https://accounts.google.com/o/oauth2/v2/auth' });

    await expect(response).resolves.toEqual({
      url: 'https://accounts.google.com/o/oauth2/v2/auth',
    });
  });

  it('disconnects the linked Google account', async () => {
    const response = firstValueFrom(service.disconnect());
    const request = http.expectOne('http://localhost:3000/integrations/google');
    expect(request.request.method).toBe('DELETE');
    request.flush({ configured: true, connected: false, scopes: [] });

    await expect(response).resolves.toEqual({
      configured: true,
      connected: false,
      scopes: [],
    });
  });
});
