export interface TemplateInterpolationContext {
  readonly name?: string;
  readonly date?: string;
  readonly paymentUrl?: string;
}

export interface TemplateInterpolationResult {
  readonly message: string;
  readonly unresolvedTokens: readonly string[];
}

const TOKEN_PATTERN = /\{\{\s*([a-zA-Z][\w]*)\s*\}\}/g;

export function interpolateTemplate(
  template: string,
  context: TemplateInterpolationContext,
): TemplateInterpolationResult {
  const unresolved = new Set<string>();
  const message = template.replace(TOKEN_PATTERN, (token: string, key: string) => {
    const value = context[key as keyof TemplateInterpolationContext];
    if (value === undefined || value === '') {
      unresolved.add(token);
      return token;
    }
    return value;
  });

  for (const token of message.match(/\{\{[^{}]*\}\}/g) ?? []) unresolved.add(token);
  return { message, unresolvedTokens: [...unresolved] };
}
