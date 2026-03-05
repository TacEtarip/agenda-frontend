import { Injectable, signal } from '@angular/core';
import { ClientProductStatus } from '../../enums/client-product-status.enum';
import { IClientProduct } from '../../interfaces/client-product.interface';
import { IProduct } from '../../interfaces/product.interface';

interface ICreateClientProductInput {
  clientId: string;
  productId: string;
  status: ClientProductStatus;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class SalesCatalogStore {
  private readonly productsState = signal<IProduct[]>([
    {
      id: 'p-1',
      userId: 'u-1',
      name: 'Plan Premium',
      description:
        'Acompañamiento completo durante 8 semanas con seguimiento semanal.',
      price: 320,
      createdAt: '2026-01-12T10:15:00.000Z',
    },
    {
      id: 'p-2',
      userId: 'u-1',
      name: 'Consulta Inicial',
      description: 'Sesión de diagnóstico y plan de trabajo personalizado.',
      price: 45,
      createdAt: '2026-02-05T15:40:00.000Z',
    },
    {
      id: 'p-3',
      userId: 'u-1',
      name: 'Pack de Mantenimiento',
      description: 'Soporte mensual para clientes postventa.',
      price: 85,
      createdAt: '2026-02-20T09:25:00.000Z',
    },
    {
      id: 'p-4',
      userId: 'u-1',
      name: 'Plantilla de Seguimiento',
      description: 'Recursos descargables para automatizar recordatorios.',
      price: 19.9,
      createdAt: '2026-02-28T13:00:00.000Z',
    },
  ]);

  private readonly clientProductsState = signal<IClientProduct[]>([
    {
      id: 'cp-1',
      clientId: '1',
      productId: 'p-1',
      status: ClientProductStatus.INTERESTED,
      offeredAt: '2026-02-27T09:00:00.000Z',
      updatedAt: '2026-02-28T14:30:00.000Z',
      notes: 'Pidio facilidades de pago en 2 cuotas.',
    },
    {
      id: 'cp-2',
      clientId: '1',
      productId: 'p-2',
      status: ClientProductStatus.OFFERED,
      offeredAt: '2026-03-01T11:15:00.000Z',
      updatedAt: '2026-03-01T11:15:00.000Z',
      notes: 'Prefiere horario de la tarde para la primera sesion.',
    },
    {
      id: 'cp-3',
      clientId: '2',
      productId: 'p-3',
      status: ClientProductStatus.SOLD,
      offeredAt: '2026-02-10T16:00:00.000Z',
      updatedAt: '2026-02-12T09:40:00.000Z',
      notes: 'Venta cerrada con mantenimiento trimestral.',
    },
  ]);

  readonly products = this.productsState.asReadonly();
  readonly clientProducts = this.clientProductsState.asReadonly();

  addProduct(input: {
    name: string;
    description?: string;
    price?: number;
    userId?: string;
  }) {
    const newProduct: IProduct = {
      id: `p-${Date.now()}`,
      userId: input.userId ?? 'u-1',
      name: input.name,
      description: input.description,
      price: input.price,
      createdAt: new Date().toISOString(),
    };

    this.productsState.update((products) => [newProduct, ...products]);
  }

  updateProduct(productId: string, updates: Partial<IProduct>) {
    this.productsState.update((products) =>
      products.map((product) =>
        product.id === productId ? { ...product, ...updates } : product,
      ),
    );
  }

  deleteProduct(productId: string) {
    this.productsState.update((products) =>
      products.filter((product) => product.id !== productId),
    );

    // Keep client-product data consistent when a catalog product is removed.
    this.clientProductsState.update((offers) =>
      offers.filter((offer) => offer.productId !== productId),
    );
  }

  createClientProduct(input: ICreateClientProductInput) {
    const now = new Date().toISOString();
    const newOffer: IClientProduct = {
      id: `cp-${Date.now()}`,
      clientId: input.clientId,
      productId: input.productId,
      status: input.status,
      offeredAt: now,
      updatedAt: now,
      notes: input.notes,
    };

    this.clientProductsState.update((offers) => [newOffer, ...offers]);
  }

  updateClientProduct(offerId: string, updates: Partial<IClientProduct>) {
    this.clientProductsState.update((offers) =>
      offers.map((offer) =>
        offer.id === offerId ? { ...offer, ...updates } : offer,
      ),
    );
  }

  deleteClientProduct(offerId: string) {
    this.clientProductsState.update((offers) =>
      offers.filter((offer) => offer.id !== offerId),
    );
  }
}
