import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TenantSessionStateService {
  private generationValue = 0;
  private readonly resetHandlers = new Set<() => void>();

  get generation(): number {
    return this.generationValue;
  }

  isCurrent(generation: number): boolean {
    return generation === this.generationValue;
  }

  registerReset(handler: () => void): () => void {
    this.resetHandlers.add(handler);
    return () => this.resetHandlers.delete(handler);
  }

  invalidate(): void {
    this.generationValue += 1;
    for (const reset of this.resetHandlers) reset();
  }
}
