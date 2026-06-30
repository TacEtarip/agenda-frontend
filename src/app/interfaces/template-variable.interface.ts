export interface TemplateVariableMetadata {
  key: 'name' | 'date' | 'paymentUrl';
  label: string;
  description: string;
  example: string;
  contexts: readonly string[];
}

export interface TemplateValidationResult {
  valid: boolean;
  detectedVariables: TemplateVariableMetadata['key'][];
  unknownVariables: string[];
  malformedTokens: string[];
  missingVariables: TemplateVariableMetadata['key'][];
}

export interface TemplatePreviewResult {
  message: string;
  validation: TemplateValidationResult;
  warnings: string[];
}
