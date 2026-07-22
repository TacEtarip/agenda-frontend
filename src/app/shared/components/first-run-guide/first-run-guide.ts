import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  arrowForwardOutline,
  calendarOutline,
  cardOutline,
  chatbubblesOutline,
  checkmarkCircleOutline,
  closeOutline,
  peopleOutline,
  pricetagOutline,
  settingsOutline,
  sparklesOutline,
} from 'ionicons/icons';
import { OnboardingService } from '../../../core/services/onboarding.service';

type GuideTone = 'welcome' | 'clients' | 'agenda' | 'products' | 'messages' | 'yape' | 'settings';
type CoachPlacement = 'top' | 'right' | 'bottom' | 'left';

interface GuideStep {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly tone: GuideTone;
  readonly benefits: readonly string[];
  readonly target?: string;
  readonly route?: string;
  readonly menuLabel?: string;
  readonly tip?: string;
}

interface TourRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

interface CoachPosition {
  readonly left: number;
  readonly top: number;
  readonly placement: CoachPlacement;
}

@Component({
  selector: 'app-first-run-guide',
  imports: [IonIcon, IonSpinner],
  templateUrl: './first-run-guide.html',
  styleUrl: './first-run-guide.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FirstRunGuideComponent {
  readonly onboarding = inject(OnboardingService);
  private readonly router = inject(Router);

  @ViewChild('guideDialog') private dialog?: ElementRef<HTMLElement>;
  @ViewChild('coachCard') private coachCard?: ElementRef<HTMLElement>;

  readonly steps: readonly GuideStep[] = [
    {
      eyebrow: 'Bienvenido a TacEtarip',
      title: 'Conoce la aplicación mientras la recorres',
      description:
        'La guía señalará cada menú real para que sepas exactamente dónde encontrar clientes, citas, ventas y cobros.',
      icon: 'sparkles-outline',
      tone: 'welcome',
      benefits: [
        'Verás dónde buscar y agregar clientes.',
        'Recorrerás Agenda, Productos, Mensajes y Pagos.',
        'Terminarás en Ajustes para conocer las integraciones.',
      ],
    },
    {
      eyebrow: 'Inicio · Clientes',
      title: 'Tus contactos están en Inicio',
      description:
        'Aquí puedes buscar, filtrar y agregar clientes. Abre uno para consultar sus citas, notas, productos y pagos.',
      icon: 'people-outline',
      tone: 'clients',
      benefits: [],
      target: 'clients',
      route: '/dashboard',
      menuLabel: 'Clientes',
      tip: 'Empieza con “Agregar cliente” y completa sus datos básicos.',
    },
    {
      eyebrow: 'Menú Agenda',
      title: 'Organiza aquí todas tus citas',
      description:
        'Consulta tu disponibilidad, crea citas y reprograma horarios sin perder el contexto del cliente.',
      icon: 'calendar-outline',
      tone: 'agenda',
      benefits: [],
      target: 'agenda-menu',
      route: '/agenda',
      menuLabel: 'Agenda',
      tip: 'TacEtarip te avisa antes de guardar un horario superpuesto.',
    },
    {
      eyebrow: 'Menú Productos',
      title: 'Tu catálogo y tus ventas viven aquí',
      description:
        'Registra productos y servicios para agregarlos después al historial comercial de cada cliente.',
      icon: 'pricetag-outline',
      tone: 'products',
      benefits: [],
      target: 'products-menu',
      route: '/products',
      menuLabel: 'Productos',
      tip: 'Define el precio una vez y reutilízalo en cada atención.',
    },
    {
      eyebrow: 'Menú Mensajes',
      title: 'Prepara respuestas para WhatsApp',
      description:
        'Crea plantillas reutilizables para recordatorios, seguimientos y solicitudes de pago.',
      icon: 'chatbubbles-outline',
      tone: 'messages',
      benefits: [],
      target: 'messages-menu',
      route: '/message-templates',
      menuLabel: 'Mensajes',
      tip: 'Las plantillas reducen errores y mantienen un tono consistente.',
    },
    {
      eyebrow: 'Menú Pagos',
      title: 'Controla cobros pendientes y pagados',
      description:
        'Desde Pagos envías la solicitud de Yape, verificas el ingreso y confirmas manualmente el cobro.',
      icon: 'card-outline',
      tone: 'yape',
      benefits: [],
      target: 'payments-menu',
      route: '/payments',
      menuLabel: 'Pagos',
      tip: 'El pago permanece pendiente hasta que confirmes que el dinero llegó.',
    },
    {
      eyebrow: 'Menú Ajustes',
      title: 'Personaliza la aplicación para tu negocio',
      description:
        'Configura tu perfil, Yape, WhatsApp y Google Calendar. Desde el menú de tu avatar también puedes volver a abrir esta guía.',
      icon: 'settings-outline',
      tone: 'settings',
      benefits: [],
      target: 'settings-menu',
      route: '/settings',
      menuLabel: 'Ajustes',
      tip: 'Puedes preparar las integraciones ahora o hacerlo más adelante.',
    },
  ];

  readonly currentStep = linkedSignal(() => {
    this.onboarding.isOpen();
    return 0;
  });
  readonly activeStep = computed(() => this.steps[this.currentStep()]);
  readonly isContextualStep = computed(() => Boolean(this.activeStep().target));
  readonly spotlightRect = signal<TourRect | null>(null);
  readonly coachPosition = signal<CoachPosition>({ left: 16, top: 16, placement: 'right' });

  constructor() {
    addIcons({
      arrowBackOutline,
      arrowForwardOutline,
      calendarOutline,
      cardOutline,
      chatbubblesOutline,
      checkmarkCircleOutline,
      closeOutline,
      peopleOutline,
      pricetagOutline,
      settingsOutline,
      sparklesOutline,
    });

    effect(() => {
      if (!this.onboarding.isOpen()) return;
      queueMicrotask(() => this.focusActiveSurface());
    });
  }

  async goTo(stepIndex: number): Promise<void> {
    if (stepIndex < 0 || stepIndex >= this.steps.length) return;

    this.currentStep.set(stepIndex);
    const step = this.steps[stepIndex];
    if (!step.target) {
      this.spotlightRect.set(null);
      queueMicrotask(() => this.focusActiveSurface());
      return;
    }

    if (step.route && this.currentRoute() !== step.route) {
      await this.router.navigateByUrl(step.route);
    }

    await this.positionContextualStep(step.target);
    this.focusActiveSurface();
  }

  previous(): void {
    void this.goTo(this.currentStep() - 1);
  }

  async next(): Promise<void> {
    if (this.currentStep() < this.steps.length - 1) {
      await this.goTo(this.currentStep() + 1);
      return;
    }

    const finished = await this.onboarding.finish();
    if (finished) await this.router.navigate(['/dashboard']);
  }

  async dismiss(): Promise<void> {
    if (this.onboarding.mode() === 'replay') {
      this.onboarding.closeReplay();
      return;
    }
    await this.onboarding.finish();
  }

  @HostListener('window:resize')
  handleResize(): void {
    const target = this.activeStep().target;
    if (this.onboarding.isOpen() && target) void this.positionContextualStep(target, false);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    if (!this.onboarding.isOpen()) return;

    if (event.key === 'Escape' && this.onboarding.mode() === 'replay') {
      event.preventDefault();
      this.onboarding.closeReplay();
      return;
    }
    if (event.key === 'ArrowLeft' && this.currentStep() > 0) {
      event.preventDefault();
      this.previous();
      return;
    }
    if (event.key === 'ArrowRight' && this.currentStep() < this.steps.length - 1) {
      event.preventDefault();
      void this.goTo(this.currentStep() + 1);
      return;
    }
    if (event.key !== 'Tab') return;

    const surface = this.activeSurface();
    const focusable = surface?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private async positionContextualStep(targetName: string, scrollTarget = true): Promise<void> {
    const target = await this.waitForVisibleTarget(targetName);
    if (!target) {
      this.spotlightRect.set(null);
      this.coachPosition.set(this.centeredCoachPosition());
      return;
    }

    if (scrollTarget) {
      target.scrollIntoView({
        block: 'center',
        inline: 'nearest',
        behavior: this.prefersReducedMotion() ? 'auto' : 'smooth',
      });
      await this.nextFrame();
      await this.nextFrame();
    }

    const targetRect = target.getBoundingClientRect();
    this.setSpotlight(targetRect);
    this.coachPosition.set(this.calculateCoachPosition(targetRect, 310));

    await this.nextFrame();
    const coachHeight = this.coachCard?.nativeElement.getBoundingClientRect().height ?? 310;
    this.coachPosition.set(
      this.calculateCoachPosition(target.getBoundingClientRect(), coachHeight),
    );
  }

  private async waitForVisibleTarget(targetName: string): Promise<HTMLElement | null> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const target = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-guide-target="${targetName}"]`),
      ).find((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      if (target) return target;
      await this.nextFrame();
    }
    return null;
  }

  private setSpotlight(rect: DOMRect): void {
    const padding = 7;
    const left = Math.max(7, rect.left - padding);
    const top = Math.max(7, rect.top - padding);
    this.spotlightRect.set({
      left,
      top,
      width: Math.min(window.innerWidth - left - 7, rect.width + padding * 2),
      height: Math.min(window.innerHeight - top - 7, rect.height + padding * 2),
    });
  }

  private calculateCoachPosition(rect: DOMRect, coachHeight: number): CoachPosition {
    const margin = 16;
    const gap = 18;
    const coachWidth = Math.min(356, window.innerWidth - margin * 2);
    const maxLeft = Math.max(margin, window.innerWidth - coachWidth - margin);
    const maxTop = Math.max(margin, window.innerHeight - coachHeight - margin);
    const centeredLeft = this.clamp(rect.left + rect.width / 2 - coachWidth / 2, margin, maxLeft);

    if (rect.right + gap + coachWidth <= window.innerWidth - margin) {
      return {
        left: rect.right + gap,
        top: this.clamp(rect.top, margin, maxTop),
        placement: 'right',
      };
    }
    if (rect.left - gap - coachWidth >= margin) {
      return {
        left: rect.left - gap - coachWidth,
        top: this.clamp(rect.top, margin, maxTop),
        placement: 'left',
      };
    }
    if (rect.bottom + gap + coachHeight <= window.innerHeight - margin) {
      return { left: centeredLeft, top: rect.bottom + gap, placement: 'bottom' };
    }

    return {
      left: centeredLeft,
      top: this.clamp(rect.top - gap - coachHeight, margin, maxTop),
      placement: 'top',
    };
  }

  private centeredCoachPosition(): CoachPosition {
    const width = Math.min(356, window.innerWidth - 32);
    return {
      left: Math.max(16, (window.innerWidth - width) / 2),
      top: Math.max(16, (window.innerHeight - 310) / 2),
      placement: 'bottom',
    };
  }

  private focusActiveSurface(): void {
    const surface = this.activeSurface();
    requestAnimationFrame(() => {
      surface?.querySelector<HTMLElement>('[data-guide-title]')?.focus();
    });
  }

  private activeSurface(): HTMLElement | undefined {
    return this.coachCard?.nativeElement ?? this.dialog?.nativeElement;
  }

  private currentRoute(): string {
    return this.router.url.split('?')[0].split('#')[0];
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private nextFrame(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
