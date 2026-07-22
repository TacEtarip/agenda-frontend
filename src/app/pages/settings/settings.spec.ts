import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { GoogleIntegrationApiService } from '../../core/services/google-integration-api.service';
import { UserApiService } from '../../core/services/user-api.service';
import { WhatsAppApiService } from '../../core/services/whatsapp-api.service';
import { PaymentStore } from '../../shared/stores/payment.store';
import { SETTINGS_STORAGE_KEY } from './constants/settings.constants';
import { SettingsPage } from './settings';

describe('SettingsPage persistence', () => {
  beforeEach(() => localStorage.removeItem(SETTINGS_STORAGE_KEY));

  it('reverts the payment toggle and exposes an error when saving fails', async () => {
    const getCulqiConfiguration = vi.fn().mockReturnValue(
      of({
        enabled: false,
        privateKeyConfigured: false,
        encryptionReady: false,
      }),
    );
    const userApi = {
      updateMySettings: vi.fn().mockReturnValue(throwError(() => new Error('network'))),
      updateMyProfile: vi.fn(),
      getUser: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [
        {
          provide: AuthService,
          useValue: { currentUser: signal(null), updateCurrentUser: vi.fn() },
        },
        { provide: UserApiService, useValue: userApi },
        {
          provide: WhatsAppApiService,
          useValue: { getStatus: () => of({ status: 'CONNECTED' }), getQrCode: vi.fn() },
        },
        {
          provide: GoogleIntegrationApiService,
          useValue: { getStatus: () => of({ configured: false, connected: false, scopes: [] }) },
        },
        {
          provide: PaymentStore,
          useValue: {
            getYapeConfiguration: () => of({ enabled: false }),
            getCulqiConfiguration,
          },
        },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: AlertController, useValue: { create: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(SettingsPage);
    const page = fixture.componentInstance;

    expect(page.advancedPaymentSettingsOpened()).toBe(false);
    expect(getCulqiConfiguration).not.toHaveBeenCalled();

    page.toggleAdvancedPaymentSettings({
      currentTarget: { open: true },
    } as unknown as Event);

    expect(getCulqiConfiguration).toHaveBeenCalledOnce();
    expect(page.culqiConfigurationLoaded()).toBe(true);

    page.updatePaymentSetting({ detail: { checked: true } } as unknown as Event);

    expect(userApi.updateMySettings).toHaveBeenCalled();
    expect(page.enablePayments()).toBe(false);
    expect(page.integrationErrorMessage()).toContain('restauró');
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeNull();
  });
});
