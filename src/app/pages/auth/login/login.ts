import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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

  readonly form = this.fb.nonNullable.group({
    companyName: [''],
    firstName: [''],
    lastName: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

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
    const { companyName, firstName, lastName } = this.form.controls;
    if (login) {
      companyName.clearValidators();
      firstName.clearValidators();
      lastName.clearValidators();
    } else {
      companyName.setValidators([Validators.required, Validators.maxLength(100)]);
      firstName.setValidators([Validators.required, Validators.maxLength(60)]);
      lastName.setValidators([Validators.required, Validators.maxLength(60)]);
    }
    companyName.updateValueAndValidity();
    firstName.updateValueAndValidity();
    lastName.updateValueAndValidity();
    this.form.reset();
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password, firstName, lastName, companyName } = this.form.getRawValue();

    const request$ = this.isLoginMode()
      ? this.authService.login(email, password)
      : this.authService.register(companyName, firstName, lastName, email, password);

    request$.subscribe({
      next: () => {
        this.isLoading.set(false);
        void this.router.navigate(['/dashboard']);
      },
      error: (err: unknown) => {
        this.isLoading.set(false);
        const message =
          (err as { error?: { message?: string } })?.error?.message ??
          'Error al conectar. Verifica tus datos.';
        this.errorMessage.set(Array.isArray(message) ? message[0] : message);
      },
    });
  }
}
