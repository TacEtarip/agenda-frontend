import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';

/**
 * Shared Ionic imports for all pages.
 * Heavy/specialised components (IonDatetime, IonFab, etc.) are intentionally
 * excluded — import them only in the pages that actually use them so that
 * unrelated lazy bundles stay small.
 */
export const COMMON_ION_PAGE_IMPORTS = [
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonCard,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonIcon,
  IonInput,
  IonModal,
  IonChip,
] as const;
