import { Component, ElementRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  logoGoogle,
  eyeOutline,
  eyeOffOutline,
  mailOutline,
  lockClosedOutline,
} from 'ionicons/icons';
import {
  IonContent,
  IonCard,
  IonCardContent,
  IonInput,
  IonButton,
  IonIcon,
  IonSpinner,
  IonToggle,
} from '@ionic/angular/standalone';
import { AuthService } from '../../../core/services/auth.service';

const PERU_PHONE_PREFIX = '+51';
const PERU_PHONE_PATTERN = /^9\d{8}$/;

export const passwordsMatchValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  return confirmPassword && password !== confirmPassword ? { passwordMismatch: true } : null;
};

@Component({
  selector: 'app-login',
  host: { class: 'ion-page' },
  imports: [
    ReactiveFormsModule,
    IonContent,
    IonCard,
    IonCardContent,
    IonInput,
    IonButton,
    IonIcon,
    IonSpinner,
    IonToggle,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly phonePrefix = PERU_PHONE_PREFIX;
  readonly isLoginMode = signal(true);
  readonly isLoading = signal(false);
  readonly showPassword = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      companyName: [''],
      firstName: [''],
      lastName: [''],
      phone: [''],
      yapeEnabled: [false],
      yapePhone: this.fb.nonNullable.control(
        { value: '', disabled: true },
        [Validators.required, Validators.pattern(PERU_PHONE_PATTERN)],
      ),
      yapeAccountName: this.fb.nonNullable.control(
        { value: '', disabled: true },
        [Validators.required, Validators.maxLength(120), Validators.pattern(/\S/)],
      ),
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: [''],
    },
    { validators: passwordsMatchValidator },
  );

  constructor() {
    addIcons({
      calendarOutline,
      logoGoogle,
      eyeOutline,
      eyeOffOutline,
      mailOutline,
      lockClosedOutline,
    });
  }

  toggleMode(login: boolean) {
    this.isLoginMode.set(login);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    const { companyName, firstName, lastName, phone, confirmPassword } = this.form.controls;
    if (login) {
      companyName.clearValidators();
      firstName.clearValidators();
      lastName.clearValidators();
      phone.clearValidators();
      confirmPassword.clearValidators();
    } else {
      companyName.setValidators([Validators.required, Validators.maxLength(100)]);
      firstName.setValidators([Validators.required, Validators.maxLength(60)]);
      lastName.setValidators([Validators.required, Validators.maxLength(60)]);
      phone.setValidators([Validators.required, Validators.pattern(PERU_PHONE_PATTERN)]);
      confirmPassword.setValidators([Validators.required]);
    }
    companyName.updateValueAndValidity();
    firstName.updateValueAndValidity();
    lastName.updateValueAndValidity();
    phone.updateValueAndValidity();
    confirmPassword.updateValueAndValidity();
    this.form.updateValueAndValidity();
    this.form.reset();
    this.setYapeControlsEnabled(false);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  // Peru mobile numbers are always 9 digits (e.g. 987654321); strip anything else as the user types.
  sanitizePhoneInput(event: CustomEvent, controlName: 'phone' | 'yapePhone' = 'phone'): void {
    const rawValue = (event.detail as { value?: string | null }).value ?? '';
    const digitsOnly = rawValue.replace(/\D/g, '').slice(0, 9);
    if (digitsOnly !== rawValue) {
      this.form.controls[controlName].setValue(digitsOnly);
    }
  }

  toggleYapeSetup(event: CustomEvent<{ checked: boolean }>): void {
    const enabled = event.detail.checked;
    this.setYapeControlsEnabled(enabled);

    if (!enabled) return;

    const { phone, firstName, lastName, yapePhone, yapeAccountName } = this.form.controls;
    if (!yapePhone.value && PERU_PHONE_PATTERN.test(phone.value)) {
      yapePhone.setValue(phone.value);
    }
    if (!yapeAccountName.value) {
      yapeAccountName.setValue(`${firstName.value} ${lastName.value}`.trim());
    }
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalidField();
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      companyName,
      yapeEnabled,
      yapePhone,
      yapeAccountName,
    } = this.form.getRawValue();
    const isLogin = this.isLoginMode();

    const request$ = isLogin
      ? this.authService.login(email, password)
      : this.authService.register({
          companyName,
          firstName,
          lastName,
          phone: `${this.phonePrefix}${phone}`,
          email,
          password,
          yapeEnabled,
          yapePhone: yapeEnabled ? yapePhone : undefined,
          yapeAccountName: yapeEnabled ? yapeAccountName : undefined,
        });

    request$.subscribe({
      next: () => {
        this.isLoading.set(false);
        if (isLogin) {
          void this.router.navigate(['/dashboard']);
          return;
        }

        this.toggleMode(true);
        this.form.controls.email.setValue(email);
        this.successMessage.set(
          'Cuenta creada correctamente. Ya puedes iniciar sesión con tu correo y contraseña.',
        );
      },
      error: (err: unknown) => {
        this.isLoading.set(false);
        this.errorMessage.set(this.resolveAuthErrorMessage(err));
      },
    });
  }

  private setYapeControlsEnabled(enabled: boolean): void {
    const { yapePhone, yapeAccountName } = this.form.controls;
    if (enabled) {
      yapePhone.enable({ emitEvent: false });
      yapeAccountName.enable({ emitEvent: false });
      return;
    }

    yapePhone.disable({ emitEvent: false });
    yapeAccountName.disable({ emitEvent: false });
  }

  private focusFirstInvalidField(): void {
    queueMicrotask(() => {
      const nativeElement = this.elementRef.nativeElement as HTMLElement;
      const invalidInput = nativeElement.querySelector('ion-input.ng-invalid') as
        | (HTMLElement & { setFocus?: () => Promise<void> })
        | null;
      void invalidInput?.setFocus?.();
    });
  }

  private resolveAuthErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No pudimos conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.';
      }

      if (error.status === 401) {
        return 'Correo o contraseña incorrectos. Revisa tus datos e inténtalo otra vez.';
      }

      if (error.status === 409) {
        return 'Ya existe una cuenta con ese correo electrónico.';
      }

      const serverMessage = error.error?.message;
      if (Array.isArray(serverMessage) && serverMessage.length > 0) {
        return serverMessage[0];
      }

      if (typeof serverMessage === 'string' && serverMessage.trim()) {
        return serverMessage;
      }
    }

    return 'No pudimos completar la solicitud. Inténtalo nuevamente en unos momentos.';
  }
}
