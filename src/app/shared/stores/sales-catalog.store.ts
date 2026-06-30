import { Injectable, inject, signal } from '@angular/core';
import { IClientProduct } from '../../interfaces/client-product.interface';
import { IProduct } from '../../interfaces/product.interface';
import { ProductApiService } from '../../core/services/product-api.service';
import { ClientProductApiService } from '../../core/services/client-product-api.service';
import { ICreateClientProductInput } from './interfaces/create-client-product-input.interface';
import { ProductType } from '../../enums/product-type.enum';

@Injectable({ providedIn: 'root' })
export class SalesCatalogStore {
  private readonly productApi = inject(ProductApiService);
  private readonly clientProductApi = inject(ClientProductApiService);
  private productsLoadRequestId = 0;
  private clientProductsLoadRequestId = 0;

  private readonly productsState = signal<IProduct[]>([]);
  private readonly clientProductsState = signal<IClientProduct[]>([]);
  private readonly productsLoadingState = signal(false);
  private readonly clientProductsLoadingState = signal(false);
  private readonly productsErrorState = signal<string | null>(null);
  private readonly clientProductsErrorState = signal<string | null>(null);

  readonly products = this.productsState.asReadonly();
  readonly clientProducts = this.clientProductsState.asReadonly();
  readonly productsLoading = this.productsLoadingState.asReadonly();
  readonly clientProductsLoading = this.clientProductsLoadingState.asReadonly();
  readonly productsError = this.productsErrorState.asReadonly();
  readonly clientProductsError = this.clientProductsErrorState.asReadonly();

  loadProducts(): void {
    const requestId = ++this.productsLoadRequestId;
    this.productsLoadingState.set(true);
    this.productsErrorState.set(null);
    this.productApi.getAll().subscribe({
      next: (products) => {
        if (requestId !== this.productsLoadRequestId) return;
        this.productsState.set(products);
        this.productsLoadingState.set(false);
      },
      error: () => {
        if (requestId !== this.productsLoadRequestId) return;
        this.productsErrorState.set('No se pudo cargar el catálogo de productos.');
        this.productsLoadingState.set(false);
      },
    });
  }

  loadClientProducts(clientId: string): void {
    const requestId = ++this.clientProductsLoadRequestId;
    this.clientProductsLoadingState.set(true);
    this.clientProductsErrorState.set(null);
    this.clientProductApi.getAllByClient(clientId).subscribe({
      next: (offers) => {
        if (requestId !== this.clientProductsLoadRequestId) return;
        this.clientProductsState.set(offers);
        this.clientProductsLoadingState.set(false);
      },
      error: () => {
        if (requestId !== this.clientProductsLoadRequestId) return;
        this.clientProductsErrorState.set('No se pudo cargar la relación de productos del cliente.');
        this.clientProductsLoadingState.set(false);
      },
    });
  }

  addProduct(input: {
    name: string;
    description?: string;
    price?: number;
    type?: ProductType;
  }): void {
    this.productsErrorState.set(null);
    this.productApi
      .create({ name: input.name, description: input.description, price: input.price, type: input.type })
      .subscribe({
        next: (product) => {
          this.productsState.update((products) => [product, ...products]);
        },
        error: () => {
          this.productsErrorState.set('No se pudo crear el producto.');
        },
      });
  }

  updateProduct(productId: string, updates: Partial<IProduct>): void {
    this.productsErrorState.set(null);
    this.productApi.update(productId, updates).subscribe({
      next: (updated) => {
        this.productsState.update((products) =>
          products.map((p) => (p.id === productId ? updated : p)),
        );
      },
      error: () => {
        this.productsErrorState.set('No se pudo actualizar el producto.');
      },
    });
  }

  deleteProduct(productId: string): void {
    this.productsErrorState.set(null);
    this.productApi.remove(productId).subscribe({
      next: () => {
        this.productsState.update((products) =>
          products.filter((p) => p.id !== productId),
        );
        this.clientProductsState.update((offers) =>
          offers.filter((o) => o.productId !== productId),
        );
      },
      error: () => {
        this.productsErrorState.set('No se pudo eliminar el producto.');
      },
    });
  }

  createClientProduct(input: ICreateClientProductInput): void {
    this.clientProductsErrorState.set(null);
    this.clientProductApi.create(input).subscribe({
      next: (offer) => {
        this.clientProductsState.update((offers) => [offer, ...offers]);
      },
      error: () => {
        this.clientProductsErrorState.set('No se pudo vincular el producto al cliente.');
      },
    });
  }

  updateClientProduct(offerId: string, updates: Partial<IClientProduct>): void {
    this.clientProductsErrorState.set(null);
    this.clientProductApi
      .update(offerId, { status: updates.status, notes: updates.notes })
      .subscribe({
        next: (updated) => {
          this.clientProductsState.update((offers) =>
            offers.map((o) => (o.id === offerId ? updated : o)),
          );
        },
        error: () => {
          this.clientProductsErrorState.set('No se pudo actualizar el producto del cliente.');
        },
      });
  }

  deleteClientProduct(offerId: string): void {
    this.clientProductsErrorState.set(null);
    this.clientProductApi.remove(offerId).subscribe({
      next: () => {
        this.clientProductsState.update((offers) =>
          offers.filter((o) => o.id !== offerId),
        );
      },
      error: () => {
        this.clientProductsErrorState.set('No se pudo eliminar el producto del cliente.');
      },
    });
  }
}

