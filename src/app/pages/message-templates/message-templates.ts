import { Component, DestroyRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  addOutline,
  arrowBackOutline,
  chatbubblesOutline,
  checkmarkCircleOutline,
  closeOutline,
  createOutline,
  sparklesOutline,
  timeOutline,
  trashOutline,
} from 'ionicons/icons';
import {
  AlertController,
  IonBackButton,
  IonTextarea,
} from '@ionic/angular/standalone';
import { ClientStage } from '../../enums/client-stage.enum';
import { IMessageTemplate } from '../../interfaces/message-template.interface';
import { COMMON_ION_PAGE_IMPORTS } from '../../shared/ionic-imports';
import { CLIENT_STAGE_OPTIONS } from '../../shared/client-stage.utils';
import { FormatDatePipe } from '../../shared/pipes/format-date.pipe';
import { MessageTemplateStore } from '../../shared/stores/message-template.store';
import { MessageTemplateApiService } from '../../core/services/message-template-api.service';
import { TemplatePreviewResult, TemplateVariableMetadata } from '../../interfaces/template-variable.interface';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { validateTemplateMessage } from './template-validation';

@Component({
  selector: 'app-message-templates',
  host: { class: 'ion-page' },
  imports: [
    ReactiveFormsModule,
    ...COMMON_ION_PAGE_IMPORTS,
    IonBackButton,
    IonTextarea,
    FormatDatePipe,
  ],
  templateUrl: './message-templates.html',
  styleUrl: './message-templates.scss',
})
export class MessageTemplatesPage {
  @ViewChild('messageTextarea') private messageTextarea?: IonTextarea;
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly alertCtrl = inject(AlertController);
  private readonly messageTemplateStore = inject(MessageTemplateStore);
  private readonly templateApi = inject(MessageTemplateApiService);

  readonly allStages = CLIENT_STAGE_OPTIONS;
  readonly templates = this.messageTemplateStore.templates;

  readonly isComposerModalOpen = signal(false);
  readonly variables = signal<TemplateVariableMetadata[]>([
    { key: 'name', label: 'Nombre del cliente', description: '', example: 'Andrea', contexts: ['all'] },
    { key: 'date', label: 'Fecha de la cita', description: '', example: '15 de julio de 2026, 10:30 a. m.', contexts: ['all'] },
    { key: 'paymentUrl', label: 'Enlace de pago', description: '', example: 'https://pago.ejemplo.com/abc123', contexts: ['all'] },
  ]);
  readonly composerBody = signal('');
  readonly preview = signal<TemplatePreviewResult | null>(null);
  readonly editingTemplateId = signal<string | null>(null);
  readonly composerStage = signal<ClientStage>(ClientStage.FIRST_CONTACT);
  readonly composerForm = this.fb.nonNullable.group({
    messageBody: ['', [Validators.required, Validators.maxLength(700)]],
  });

  readonly stageSections = computed(() =>
    this.allStages.map((stage) => ({
      ...stage,
      templates: this.templates()
        .filter((template) => template.stage === stage.value)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    })),
  );

  readonly totalTemplatesCount = computed(() => this.templates().length);

  readonly stagesWithTemplatesCount = computed(
    () => this.stageSections().filter((section) => section.templates.length > 0).length,
  );

  readonly coveragePercentage = computed(() =>
    Math.round(
      (this.stagesWithTemplatesCount() / this.stageSections().length) * 100,
    ),
  );

  readonly isEditing = computed(() => this.editingTemplateId() !== null);

  readonly composerStageMeta = computed(
    () =>
      this.allStages.find((stage) => stage.value === this.composerStage()) ??
      this.allStages[0],
  );

  readonly validation = computed(() => validateTemplateMessage(this.composerBody(), this.variables()));
  readonly usedVariables = computed(() => {
    const detected = new Set(this.validation().detectedVariables);
    return this.variables().filter(({ key }) => detected.has(key));
  });
  readonly characterCount = computed(() => this.composerBody().length);

  constructor() {
    addIcons({
      addOutline,
      arrowBackOutline,
      chatbubblesOutline,
      checkmarkCircleOutline,
      closeOutline,
      createOutline,
      sparklesOutline,
      timeOutline,
      trashOutline,
    });

    this.composerForm.controls.messageBody.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef),
      distinctUntilChanged(),
      tap((messageBody) => this.composerBody.set(messageBody)),
      debounceTime(250),
      switchMap((messageBody) => {
        const validation = validateTemplateMessage(messageBody, this.variables());
        if (!messageBody.trim() || !validation.valid) return of(null);
        return this.templateApi.preview(this.composerStage(), messageBody).pipe(catchError(() => of(null)));
      }),
    ).subscribe((preview) => this.preview.set(preview));
  }

  ionViewWillEnter(): void {
    this.messageTemplateStore.load();
    this.templateApi.getMetadata().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ variables }) => this.variables.set(variables),
    });
  }

  openCreateTemplateModal(stage: ClientStage) {
    this.editingTemplateId.set(null);
    this.composerStage.set(stage);
    this.composerForm.reset({ messageBody: '' });
    this.composerForm.markAsPristine();
    this.composerForm.markAsUntouched();
    this.isComposerModalOpen.set(true);
  }

  openEditTemplateModal(template: IMessageTemplate) {
    this.editingTemplateId.set(template.id);
    this.composerStage.set(template.stage);
    this.composerForm.reset({ messageBody: template.messageBody });
    this.composerForm.markAsPristine();
    this.composerForm.markAsUntouched();
    this.isComposerModalOpen.set(true);
  }

  closeComposerModal(resetForm = true) {
    this.isComposerModalOpen.set(false);
    this.editingTemplateId.set(null);

    if (resetForm) {
      this.composerForm.reset({ messageBody: '' });
      this.composerForm.markAsPristine();
      this.composerForm.markAsUntouched();
    }
  }

  async insertVariable(key: TemplateVariableMetadata['key']) {
    const input = await this.messageTextarea?.getInputElement();
    const control = this.composerForm.controls.messageBody;
    const current = control.value;
    const token = `{{${key}}}`;
    const start = input?.selectionStart ?? current.length;
    const end = input?.selectionEnd ?? start;
    control.setValue(`${current.slice(0, start)}${token}${current.slice(end)}`);
    this.composerForm.controls.messageBody.markAsDirty();
    queueMicrotask(() => {
      input?.focus();
      input?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  saveTemplate() {
    const messageBody = this.composerForm.controls.messageBody.value.trim();
    if (!messageBody || this.composerForm.invalid || !this.validation().valid) {
      if (!messageBody) {
        this.composerForm.controls.messageBody.setErrors({ required: true });
      }

      this.composerForm.markAllAsTouched();
      return;
    }

    this.messageTemplateStore.saveTemplate({
      templateId: this.editingTemplateId() ?? undefined,
      stage: this.composerStage(),
      messageBody,
    });

    this.closeComposerModal();
  }

  humanizeMessage(message: string): string {
    return this.variables().reduce((text, variable) => text.replaceAll(`{{${variable.key}}}`, `[${variable.label}]`), message);
  }

  variableLabel(key: string): string {
    return this.variables().find((variable) => variable.key === key)?.label ?? key;
  }

  async deleteTemplate(template: IMessageTemplate) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar plantilla',
      message: `¿Eliminar la plantilla de ${this.composerStageLabel(template.stage)}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.messageTemplateStore.deleteTemplate(template.id);
          },
        },
      ],
    });

    await alert.present();
  }

  private composerStageLabel(stage: ClientStage): string {
    return (
      this.allStages.find((option) => option.value === stage)?.label ?? stage
    );
  }
}
