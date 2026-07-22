import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { OnboardingService } from './onboarding.service';
import { UserApiService } from './user-api.service';

describe('OnboardingService', () => {
  const users = {
    getUser: vi.fn(),
    updateMySettings: vi.fn(),
  };
  const auth = { updateCurrentUser: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        OnboardingService,
        { provide: UserApiService, useValue: users },
        { provide: AuthService, useValue: auth },
      ],
    });
  });

  it('opens the guide for an account that has not completed onboarding', async () => {
    users.getUser.mockReturnValue(
      of({
        userId: 'user-1',
        companyId: 'company-1',
        email: 'new@example.test',
        onboardingCompleted: false,
      }),
    );
    const service = TestBed.inject(OnboardingService);

    await service.initialize('user-1');

    expect(service.isOpen()).toBe(true);
    expect(service.mode()).toBe('first-run');
  });

  it('does not interrupt an account that already completed onboarding', async () => {
    users.getUser.mockReturnValue(
      of({
        userId: 'user-1',
        companyId: 'company-1',
        email: 'existing@example.test',
        onboardingCompleted: true,
      }),
    );
    const service = TestBed.inject(OnboardingService);

    await service.initialize('user-1');

    expect(service.isOpen()).toBe(false);
  });

  it('keeps the guide open when completion cannot be saved', async () => {
    users.getUser.mockReturnValue(
      of({
        userId: 'user-1',
        companyId: 'company-1',
        email: 'new@example.test',
        onboardingCompleted: false,
      }),
    );
    users.updateMySettings.mockReturnValue(throwError(() => new Error('offline')));
    const service = TestBed.inject(OnboardingService);
    await service.initialize('user-1');

    await expect(service.finish()).resolves.toBe(false);
    expect(service.isOpen()).toBe(true);
    expect(service.error()).toContain('No pudimos guardar');
  });
});
