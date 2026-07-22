import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../core/services/auth.service';
import { OnboardingService } from '../../../core/services/onboarding.service';
import { AppShell } from './app-shell';

@Component({ template: '<p>Dashboard</p>' })
class DashboardStub {}

describe('AppShell', () => {
  it('renders the responsive destinations and marks the active route', async () => {
    TestBed.configureTestingModule({
      imports: [AppShell],
      providers: [
        provideRouter([{ path: 'dashboard', component: DashboardStub }]),
        { provide: AuthService, useValue: { currentUser: () => null } },
        {
          provide: OnboardingService,
          useValue: {
            initialize: vi.fn(),
            isOpen: () => false,
            mode: () => 'replay',
            isSaving: () => false,
            error: () => null,
          },
        },
      ],
    });
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/dashboard');

    const fixture = TestBed.createComponent(AppShell);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const desktopLinks = element.querySelectorAll('.app-shell__nav-link');
    const mobileLinks = element.querySelectorAll('.app-shell__bottom-link');

    expect(desktopLinks).toHaveLength(6);
    expect(mobileLinks).toHaveLength(6);
    expect(element.querySelector('.app-shell__nav-link--active')?.textContent).toContain('Inicio');
    expect(element.querySelector('.app-skip-link')?.getAttribute('href')).toBe('#route-content');
  });
});
