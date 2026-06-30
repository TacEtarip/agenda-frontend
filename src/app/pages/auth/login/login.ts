import { Component, inject, signal } from '@angular/core';
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
} from '@ionic/angular/standalone';
import { AuthService } from '../../../core/services/auth.service';

export const passwordsMatchValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  return confirmPassword && password !== confirmPassword
    ? { passwordMismatch: true }
    : null;
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
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

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
    const { companyName, firstName, lastName, confirmPassword } =
      this.form.controls;
    if (login) {
      companyName.clearValidators();
      firstName.clearValidators();
      lastName.clearValidators();
      confirmPassword.clearValidators();
    } else {
      companyName.setValidators([Validators.required, Validators.maxLength(100)]);
      firstName.setValidators([Validators.required, Validators.maxLength(60)]);
      lastName.setValidators([Validators.required, Validators.maxLength(60)]);
      confirmPassword.setValidators([Validators.required]);
    }
    companyName.updateValueAndValidity();
    firstName.updateValueAndValidity();
    lastName.updateValueAndValidity();
    confirmPassword.updateValueAndValidity();
    this.form.updateValueAndValidity();
    this.form.reset();
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const { email, password, firstName, lastName, companyName } = this.form.getRawValue();
    const isLogin = this.isLoginMode();

    const request$ = isLogin
      ? this.authService.login(email, password)
      : this.authService.register(companyName, firstName, lastName, email, password);

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
