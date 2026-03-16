import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageTemplatesPage {
  private readonly fb = inject(FormBuilder);
  private readonly alertCtrl = inject(AlertController);
  private readonly messageTemplateStore = inject(MessageTemplateStore);

  readonly allStages = CLIENT_STAGE_OPTIONS;
  readonly templates = this.messageTemplateStore.templates;

  readonly isComposerModalOpen = signal(false);
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
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
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

  saveTemplate() {
    const messageBody = this.composerForm.controls.messageBody.value.trim();
    if (!messageBody || this.composerForm.invalid) {
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
