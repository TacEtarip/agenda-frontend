import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cardOutline,
  chatbubblesOutline,
  gridOutline,
  pricetagOutline,
  settingsOutline,
} from 'ionicons/icons';

interface AppNavigationItem {
  readonly label: string;
  readonly shortLabel: string;
  readonly icon: string;
  readonly route: string;
}

@Component({
  selector: 'app-app-shell',
  host: { class: 'ion-page' },
  imports: [IonIcon, IonRouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShell {
  readonly navigationItems: readonly AppNavigationItem[] = [
    { label: 'Inicio', shortLabel: 'Inicio', icon: 'grid-outline', route: '/dashboard' },
    { label: 'Productos', shortLabel: 'Productos', icon: 'pricetag-outline', route: '/products' },
    { label: 'Mensajes', shortLabel: 'Mensajes', icon: 'chatbubbles-outline', route: '/message-templates' },
    { label: 'Pagos', shortLabel: 'Pagos', icon: 'card-outline', route: '/payments' },
    { label: 'Ajustes', shortLabel: 'Ajustes', icon: 'settings-outline', route: '/settings' },
  ];

  constructor() {
    addIcons({
      cardOutline,
      chatbubblesOutline,
      gridOutline,
      pricetagOutline,
      settingsOutline,
    });
  }
}
