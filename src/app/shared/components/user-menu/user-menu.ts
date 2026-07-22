import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPopover,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  gridOutline,
  helpCircleOutline,
  logOutOutline,
  personCircleOutline,
  settingsOutline,
} from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth.service';
import { OnboardingService } from '../../../core/services/onboarding.service';

@Component({
  selector: 'app-user-menu',
  imports: [IonButton, IonIcon, IonItem, IonLabel, IonList, IonPopover, RouterLink],
  templateUrl: './user-menu.html',
  styleUrl: './user-menu.scss',
})
export class UserMenuComponent {
  private readonly authService = inject(AuthService);
  private readonly onboarding = inject(OnboardingService);

  readonly isOpen = signal(false);
  readonly menuEvent = signal<Event | undefined>(undefined);
  readonly userLabel = computed(() => {
    const user = this.authService.currentUser();
    return user?.companyName || user?.email || 'Mi cuenta';
  });

  constructor() {
    addIcons({
      gridOutline,
      helpCircleOutline,
      logOutOutline,
      personCircleOutline,
      settingsOutline,
    });
  }

  open(event: Event): void {
    this.menuEvent.set(event);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  logout(): void {
    this.close();
    this.authService.logout();
  }

  openGuide(): void {
    this.close();
    this.onboarding.openReplay();
  }
}
