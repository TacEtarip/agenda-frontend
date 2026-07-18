import { describe, expect, it } from 'vitest';
import { interpolateTemplate } from './template-interpolation.utils';

describe('interpolateTemplate', () => {
  it('replaces every occurrence and reports missing context', () => {
    const result = interpolateTemplate('Hola {{name}}, {{name}}: {{paymentUrl}}', { name: 'Ana' });
    expect(result.message).toBe('Hola Ana, Ana: {{paymentUrl}}');
    expect(result.unresolvedTokens).toEqual(['{{paymentUrl}}']);
  });
});
