import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly isLoginMode = signal(true);
  readonly isLoading = signal(false);
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
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
    const { firstName, lastName } = this.form.controls;
    if (login) {
      firstName.clearValidators();
      lastName.clearValidators();
    } else {
      firstName.setValidators([Validators.required, Validators.maxLength(60)]);
      lastName.setValidators([Validators.required, Validators.maxLength(60)]);
    }
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
    const timeoutId = setTimeout(() => {
      this.isLoading.set(false);
      void this.router.navigate(['/dashboard']);
    }, 800);
    this.destroyRef.onDestroy(() => clearTimeout(timeoutId));
  }
}
