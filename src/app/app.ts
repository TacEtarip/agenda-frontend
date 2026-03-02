import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

@Component({
  selector: 'app-root',
  imports: [IonRouterOutlet, IonApp],
  template: `<ion-app><ion-router-outlet /></ion-app>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
