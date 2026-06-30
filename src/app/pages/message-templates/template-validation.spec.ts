import { describe, expect, it } from 'vitest';
import { TemplateVariableMetadata } from '../../interfaces/template-variable.interface';
import { validateTemplateMessage } from './template-validation';

const variables: TemplateVariableMetadata[] = [
  { key: 'name', label: 'Nombre del cliente', description: '', example: 'Andrea', contexts: ['all'] },
  { key: 'date', label: 'Fecha de la cita', description: '', example: '15 de julio', contexts: ['all'] },
  { key: 'paymentUrl', label: 'Enlace de pago', description: '', example: 'https://pago.test', contexts: ['all'] },
];

describe('validateTemplateMessage', () => {
  it('accepts supported variables, including repeated ones', () => {
    expect(validateTemplateMessage('{{name}} {{name}} {{date}}', variables)).toMatchObject({ valid: true, detectedVariables: ['name', 'date'] });
  });

  it.each(['{{nombre}}', '{{ name }}', 'Hola {{name'])('rejects %s', (message) => {
    expect(validateTemplateMessage(message, variables).valid).toBe(false);
  });
});
