import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TOKEN_KEY, USER_KEY } from '../constants/auth-storage.constants';
import { authGuard, guestGuard, sessionRedirectGuard } from './auth.guard';

@Component({ template: '' })
class TestPage {}

const token = (payload: object): string => {
  const encode = (value: object) =>
    btoa(JSON.stringify(value))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`;
};

describe('authentication routing', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: '', canActivate: [sessionRedirectGuard], children: [] },
          { path: 'login', component: TestPage, canActivate: [guestGuard] },
          { path: 'dashboard', component: TestPage, canActivate: [authGuard] },
        ]),
      ],
    });
  });

  it('redirects the root to login without a session', async () => {
    const harness = await RouterTestingHarness.create('/');

    expect(TestBed.inject(Router).url).toBe('/login');
    expect(harness.routeNativeElement).toBeTruthy();
  });

  it('redirects the root and login to dashboard with a valid session', async () => {
    localStorage.setItem(
      TOKEN_KEY,
      token({ sub: 'user-1', email: 'user@test.dev', exp: 4_102_444_800 }),
    );
    const harness = await RouterTestingHarness.create('/');
    expect(TestBed.inject(Router).url).toBe('/dashboard');

    await harness.navigateByUrl('/login');
    expect(TestBed.inject(Router).url).toBe('/dashboard');
  });

  it.each([
    ['missing', null],
    ['malformed', 'not-a-jwt'],
    ['expired', token({ sub: 'user-1', exp: 1 })],
  ])('rejects a %s token and clears all session storage', async (_case, value) => {
    if (value) localStorage.setItem(TOKEN_KEY, value);
    localStorage.setItem(USER_KEY, JSON.stringify({ userId: 'stale-user' }));
    const harness = await RouterTestingHarness.create('/login');

    await harness.navigateByUrl('/dashboard');

    expect(TestBed.inject(Router).url).toBe('/login');
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });

  it('reconstructs a coherent user from the valid JWT', async () => {
    localStorage.setItem(
      TOKEN_KEY,
      token({ sub: 'jwt-user', email: 'jwt@test.dev', exp: 4_102_444_800 }),
    );
    localStorage.setItem(
      USER_KEY,
      JSON.stringify({ userId: 'stale-user', email: 'old@test.dev' }),
    );

    await RouterTestingHarness.create('/dashboard');

    expect(JSON.parse(localStorage.getItem(USER_KEY)!)).toEqual({
      userId: 'jwt-user',
      email: 'jwt@test.dev',
    });
  });
});
