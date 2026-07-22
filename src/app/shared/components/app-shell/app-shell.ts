import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cardOutline,
  calendarOutline,
  chatbubblesOutline,
  gridOutline,
  pricetagOutline,
  settingsOutline,
} from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth.service';
import { OnboardingService } from '../../../core/services/onboarding.service';
import { FirstRunGuideComponent } from '../first-run-guide/first-run-guide';

interface AppNavigationItem {
  readonly label: string;
  readonly shortLabel: string;
  readonly icon: string;
  readonly route: string;
  readonly guideTarget: string;
}

@Component({
  selector: 'app-app-shell',
  host: { class: 'ion-page' },
  imports: [IonIcon, IonRouterOutlet, RouterLink, RouterLinkActive, FirstRunGuideComponent],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShell {
  private readonly auth = inject(AuthService);
  private readonly onboarding = inject(OnboardingService);

  readonly navigationItems: readonly AppNavigationItem[] = [
    {
      label: 'Inicio',
      shortLabel: 'Inicio',
      icon: 'grid-outline',
      route: '/dashboard',
      guideTarget: 'dashboard-menu',
    },
    {
      label: 'Agenda',
      shortLabel: 'Agenda',
      icon: 'calendar-outline',
      route: '/agenda',
      guideTarget: 'agenda-menu',
    },
    {
      label: 'Productos',
      shortLabel: 'Productos',
      icon: 'pricetag-outline',
      route: '/products',
      guideTarget: 'products-menu',
    },
    {
      label: 'Mensajes',
      shortLabel: 'Mensajes',
      icon: 'chatbubbles-outline',
      route: '/message-templates',
      guideTarget: 'messages-menu',
    },
    {
      label: 'Pagos',
      shortLabel: 'Pagos',
      icon: 'card-outline',
      route: '/payments',
      guideTarget: 'payments-menu',
    },
    {
      label: 'Ajustes',
      shortLabel: 'Ajustes',
      icon: 'settings-outline',
      route: '/settings',
      guideTarget: 'settings-menu',
    },
  ];

  constructor() {
    addIcons({
      cardOutline,
      calendarOutline,
      chatbubblesOutline,
      gridOutline,
      pricetagOutline,
      settingsOutline,
    });

    effect(() => {
      const userId = this.auth.currentUser()?.userId;
      if (userId) void this.onboarding.initialize(userId);
    });
  }
}
