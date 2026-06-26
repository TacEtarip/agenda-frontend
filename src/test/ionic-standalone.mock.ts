import { Component } from '@angular/core';

@Component({
  selector: 'ion-app',
  standalone: true,
  template: '<ng-content />',
})
export class IonApp {}

@Component({
  selector: 'ion-router-outlet',
  standalone: true,
  template: '',
})
export class IonRouterOutlet {}
