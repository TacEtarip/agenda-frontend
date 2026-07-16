import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { AppointmentApiService } from '../../core/services/appointment-api.service';
import { AuthService } from '../../core/services/auth.service';
import { ClientApiService } from '../../core/services/client-api.service';
import { PaymentApiService } from '../../core/services/payment-api.service';
import { IAppointmentApi } from '../../core/interfaces/appointment-api.interface';
import { DashboardPage } from './dashboard';

describe('DashboardPage client form', () => {
  it('focuses the first invalid field and exposes an actionable status', () => {
    vi.useFakeTimers();
    const setFocus = vi.fn().mockResolvedValue(undefined);
    const elementSpy = vi.spyOn(document, 'getElementById').mockReturnValue({ setFocus } as unknown as HTMLElement);
    TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        { provide: AuthService, useValue: { currentUser: () => null } },
        { provide: ClientApiService, useValue: { create: vi.fn() } },
        { provide: AppointmentApiService, useValue: {} },
        { provide: PaymentApiService, useValue: {} },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    const page = TestBed.runInInjectionContext(() => new DashboardPage());

    page.createClient();
    vi.runAllTimers();

    expect(elementSpy).toHaveBeenCalledWith('add-client-first-name');
    expect(setFocus).toHaveBeenCalledOnce();
    expect(page.addClientStatusMessage()).toContain('Revisa los campos');
    vi.useRealTimers();
  });

  it('orders scheduled appointments chronologically for the agenda timeline', () => {
    TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        { provide: AuthService, useValue: { currentUser: () => null } },
        { provide: ClientApiService, useValue: {} },
        { provide: AppointmentApiService, useValue: {} },
        { provide: PaymentApiService, useValue: {} },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    const page = TestBed.runInInjectionContext(() => new DashboardPage());
    const baseAppointment: IAppointmentApi = {
      id: 'late',
      clientId: 'client-1',
      userId: 'user-1',
      title: 'Seguimiento',
      startTime: '2026-07-10T16:00:00-05:00',
      endTime: '2026-07-10T17:00:00-05:00',
      status: 'scheduled',
    };
    page.appointmentsToday.set([
      baseAppointment,
      { ...baseAppointment, id: 'early', startTime: '2026-07-10T09:00:00-05:00' },
    ]);

    expect(page.upcomingAppointments().map((appointment) => appointment.id)).toEqual(['early', 'late']);
  });
});
