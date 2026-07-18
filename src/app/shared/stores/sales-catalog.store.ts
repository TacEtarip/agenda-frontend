import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, tap, throwError } from 'rxjs';
import { ClientProductApiService } from '../../core/services/client-product-api.service';
import { ProductApiService } from '../../core/services/product-api.service';
import { ProductType } from '../../enums/product-type.enum';
import { IClientProduct } from '../../interfaces/client-product.interface';
import { IProduct } from '../../interfaces/product.interface';
import { ICreateClientProductInput } from './interfaces/create-client-product-input.interface';

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
  private readonly productsMutatingState = signal(false);
  private readonly clientProductsMutatingState = signal(false);
  private readonly productsErrorState = signal<string | null>(null);
  private readonly clientProductsErrorState = signal<string | null>(null);

  readonly products = this.productsState.asReadonly();
  readonly clientProducts = this.clientProductsState.asReadonly();
  readonly productsLoading = this.productsLoadingState.asReadonly();
  readonly clientProductsLoading = this.clientProductsLoadingState.asReadonly();
  readonly productsMutating = this.productsMutatingState.asReadonly();
  readonly clientProductsMutating = this.clientProductsMutatingState.asReadonly();
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

  addProduct(input: { name: string; description?: string; price?: number; type?: ProductType }): Observable<IProduct> {
    this.productsErrorState.set(null);
    this.productsMutatingState.set(true);
    return this.productApi.create(input).pipe(
      tap((product) => this.productsState.update((products) => [product, ...products])),
      catchError((error: unknown) => {
        this.productsErrorState.set('No se pudo crear el producto.');
        return throwError(() => error);
      }),
      finalize(() => this.productsMutatingState.set(false)),
    );
  }

  updateProduct(productId: string, updates: Partial<IProduct>): Observable<IProduct> {
    this.productsErrorState.set(null);
    this.productsMutatingState.set(true);
    return this.productApi.update(productId, updates).pipe(
      tap((updated) => this.productsState.update((products) => products.map((product) => product.id === productId ? updated : product))),
      catchError((error: unknown) => {
        this.productsErrorState.set('No se pudo actualizar el producto.');
        return throwError(() => error);
      }),
      finalize(() => this.productsMutatingState.set(false)),
    );
  }

  deleteProduct(productId: string): Observable<void> {
    this.productsErrorState.set(null);
    this.productsMutatingState.set(true);
    return this.productApi.remove(productId).pipe(
      tap(() => {
        this.productsState.update((products) => products.filter((product) => product.id !== productId));
        this.clientProductsState.update((offers) => offers.filter((offer) => offer.productId !== productId));
      }),
      catchError((error: unknown) => {
        this.productsErrorState.set('No se pudo eliminar el producto.');
        return throwError(() => error);
      }),
      finalize(() => this.productsMutatingState.set(false)),
    );
  }

  createClientProduct(input: ICreateClientProductInput): Observable<IClientProduct> {
    this.clientProductsErrorState.set(null);
    this.clientProductsMutatingState.set(true);
    return this.clientProductApi.create(input).pipe(
      tap((offer) => this.clientProductsState.update((offers) => [offer, ...offers])),
      catchError((error: unknown) => {
        this.clientProductsErrorState.set('No se pudo vincular el producto al cliente.');
        return throwError(() => error);
      }),
      finalize(() => this.clientProductsMutatingState.set(false)),
    );
  }

  updateClientProduct(offerId: string, updates: Partial<IClientProduct>): Observable<IClientProduct> {
    this.clientProductsErrorState.set(null);
    this.clientProductsMutatingState.set(true);
    return this.clientProductApi.update(offerId, {
      status: updates.status,
      notes: updates.notes,
      customPrice: updates.customPrice,
      quantity: updates.quantity,
    }).pipe(
      tap((updated) => this.clientProductsState.update((offers) => offers.map((offer) => offer.id === offerId ? updated : offer))),
      catchError((error: unknown) => {
        this.clientProductsErrorState.set('No se pudo actualizar el producto del cliente.');
        return throwError(() => error);
      }),
      finalize(() => this.clientProductsMutatingState.set(false)),
    );
  }

  deleteClientProduct(offerId: string): Observable<void> {
    this.clientProductsErrorState.set(null);
    this.clientProductsMutatingState.set(true);
    return this.clientProductApi.remove(offerId).pipe(
      tap(() => this.clientProductsState.update((offers) => offers.filter((offer) => offer.id !== offerId))),
      catchError((error: unknown) => {
        this.clientProductsErrorState.set('No se pudo eliminar el producto del cliente.');
        return throwError(() => error);
      }),
      finalize(() => this.clientProductsMutatingState.set(false)),
    );
  }
}
