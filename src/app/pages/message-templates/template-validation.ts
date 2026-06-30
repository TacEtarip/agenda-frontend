import { TemplateValidationResult, TemplateVariableMetadata } from '../../interfaces/template-variable.interface';

export function validateTemplateMessage(message: string, variables: TemplateVariableMetadata[]): TemplateValidationResult {
  const keys = new Set(variables.map(({ key }) => key));
  const detected = new Set<TemplateVariableMetadata['key']>();
  const unknown = new Set<string>();
  const malformed = new Set<string>();
  const pattern = /\{\{([^{}]*)\}\}/g;

  for (const match of message.matchAll(pattern)) {
    const rawKey = match[1];
    if (rawKey !== rawKey.trim()) malformed.add(match[0]);
    else if (!keys.has(rawKey as TemplateVariableMetadata['key'])) unknown.add(rawKey || match[0]);
    else detected.add(rawKey as TemplateVariableMetadata['key']);
  }

  const remainder = message.replace(pattern, '');
  if (remainder.includes('{{') || remainder.includes('}}')) malformed.add('Llaves incompletas o desbalanceadas');
  return { valid: unknown.size === 0 && malformed.size === 0, detectedVariables: [...detected], unknownVariables: [...unknown], malformedTokens: [...malformed], missingVariables: [] };
}
