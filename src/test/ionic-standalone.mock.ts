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

export class AlertController {}

// Lightweight aliases used by standalone component unit tests. Their templates
// are irrelevant to class-level tests; exporting real component definitions
// keeps Angular's TestBed dependency graph valid.
export {
  IonApp as IonButton,
  IonApp as IonBackButton,
  IonApp as IonBadge,
  IonApp as IonButtons,
  IonApp as IonCard,
  IonApp as IonCardContent,
  IonApp as IonChip,
  IonApp as IonContent,
  IonApp as IonDatetime,
  IonApp as IonDatetimeButton,
  IonApp as IonHeader,
  IonApp as IonIcon,
  IonApp as IonInput,
  IonApp as IonInfiniteScroll,
  IonApp as IonInfiniteScrollContent,
  IonApp as IonItem,
  IonApp as IonLabel,
  IonApp as IonList,
  IonApp as IonModal,
  IonApp as IonNote,
  IonApp as IonPopover,
  IonApp as IonRadio,
  IonApp as IonRadioGroup,
  IonApp as IonSearchbar,
  IonApp as IonSegment,
  IonApp as IonSegmentButton,
  IonApp as IonSelect,
  IonApp as IonSelectOption,
  IonApp as IonTextarea,
  IonApp as IonToggle,
  IonApp as IonSpinner,
  IonApp as IonTitle,
  IonApp as IonToolbar,
};
