import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { SalesCatalogStore } from '../../shared/stores/sales-catalog.store';
import { ProductsPage } from './products';

describe('ProductsPage mutations', () => {
  it('keeps the modal and draft open when creation fails', async () => {
    const store = {
      products: signal([]),
      productsLoading: signal(false),
      productsMutating: signal(false),
      productsError: signal(null),
      addProduct: vi.fn().mockReturnValue(throwError(() => new Error('network'))),
      loadProducts: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [ProductsPage],
      providers: [
        { provide: SalesCatalogStore, useValue: store },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: AlertController, useValue: { create: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProductsPage);
    const page = fixture.componentInstance;
    page.openCreateProductModal();
    page.createProductForm.patchValue({ name: 'Consultoría', price: '90' });

    page.createProduct();

    expect(page.isCreateModalOpen()).toBe(true);
    expect(page.createProductForm.controls.name.value).toBe('Consultoría');
    expect(page.mutationError()).toContain('Conservamos tu borrador');
  });
});
