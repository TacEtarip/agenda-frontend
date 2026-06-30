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

// Lightweight aliases used by standalone component unit tests. Their templates
// are irrelevant to class-level tests; exporting real component definitions
// keeps Angular's TestBed dependency graph valid.
export {
  IonApp as IonButton,
  IonApp as IonButtons,
  IonApp as IonContent,
  IonApp as IonHeader,
  IonApp as IonIcon,
  IonApp as IonInput,
  IonApp as IonItem,
  IonApp as IonLabel,
  IonApp as IonModal,
  IonApp as IonNote,
  IonApp as IonSegment,
  IonApp as IonSegmentButton,
  IonApp as IonSelect,
  IonApp as IonSelectOption,
  IonApp as IonTextarea,
  IonApp as IonTitle,
  IonApp as IonToolbar,
};
