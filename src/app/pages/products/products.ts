import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  addOutline,
  arrowBackOutline,
  cashOutline,
  closeOutline,
  createOutline,
  pricetagOutline,
  swapVerticalOutline,
  trashOutline,
} from 'ionicons/icons';
import {
  AlertController,
  IonBackButton,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonTextarea,
} from '@ionic/angular/standalone';
import { IProduct } from '../../interfaces/product.interface';
import { COMMON_ION_PAGE_IMPORTS } from '../../shared/ionic-imports';
import { FormatDatePipe } from '../../shared/pipes/format-date.pipe';
import { FormatPricePipe } from '../../shared/pipes/format-price.pipe';
import { SalesCatalogStore } from '../../shared/stores/sales-catalog.store';
import { ProductSort } from './enums/product-sort.enum';
import { VALID_PRODUCT_SORTS } from './constants/product-sort.constants';
import { ProductType } from '../../enums/product-type.enum';
import { UserMenuComponent } from '../../shared/components/user-menu/user-menu';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-products',
  host: { class: 'ion-page' },
  imports: [
    ReactiveFormsModule,
    ...COMMON_ION_PAGE_IMPORTS,
    IonBackButton,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    FormatDatePipe,
    FormatPricePipe,
    UserMenuComponent,
  ],
  templateUrl: './products.html',
  styleUrl: './products.scss',
})
export class ProductsPage {
  private readonly fb = inject(FormBuilder);
  private readonly alertCtrl = inject(AlertController);
  readonly salesCatalogStore = inject(SalesCatalogStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly priceFormatter = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 2,
  });

  readonly products = this.salesCatalogStore.products;
  readonly productsLoading = this.salesCatalogStore.productsLoading;
  readonly productsMutating = this.salesCatalogStore.productsMutating;
  readonly productsError = this.salesCatalogStore.productsError;
  readonly mutationError = signal<string | null>(null);

  readonly isCreateModalOpen = signal(false);
  readonly productDisplayLimit = signal(20);
  readonly searchQuery = signal('');
  readonly sortMode = signal<ProductSort>(ProductSort.RECENT);
  readonly productType = ProductType;
  readonly createProductForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    description: ['', [Validators.maxLength(280)]],
    price: ['', [Validators.pattern(/^\d+([.,]\d{1,2})?$/)]],
    type: [ProductType.PRODUCT],
  });

  readonly pricedProducts = computed(() =>
    this.products().filter((product) => product.price !== undefined),
  );

  readonly averagePrice = computed(() => {
    const priced = this.pricedProducts();
    if (priced.length === 0) return null;
    const total = priced.reduce((sum, product) => sum + (product.price ?? 0), 0);
    return total / priced.length;
  });

  readonly catalogValue = computed(() =>
    this.pricedProducts().reduce((sum, product) => sum + (product.price ?? 0), 0),
  );

  readonly formattedAveragePrice = computed(() => {
    const avg = this.averagePrice();
    if (avg === null) return 'Sin datos';
    return this.priceFormatter.format(avg);
  });

  readonly visibleProducts = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const sort = this.sortMode();

    const filtered = query
      ? this.products().filter((product) => {
          const text = `${product.name} ${product.description ?? ''}`.toLowerCase();
          return text.includes(query);
        })
      : [...this.products()];

    return filtered.sort((a, b) => {
      if (sort === ProductSort.NAME) return a.name.localeCompare(b.name, 'es');
      if (sort === ProductSort.PRICE_DESC) return (b.price ?? -1) - (a.price ?? -1);
      if (sort === ProductSort.PRICE_ASC) return (a.price ?? Number.MAX_VALUE) - (b.price ?? Number.MAX_VALUE);
      return b.createdAt.localeCompare(a.createdAt);
    });
  });

  readonly pagedProducts = computed(() =>
    this.visibleProducts().slice(0, this.productDisplayLimit()),
  );

  constructor() {
    addIcons({
      addOutline,
      arrowBackOutline,
      cashOutline,
      closeOutline,
      createOutline,
      pricetagOutline,
      swapVerticalOutline,
      trashOutline,
    });
    const query = this.route.snapshot.queryParamMap;
    this.searchQuery.set(query.get('q') ?? '');
    const sort = query.get('sort') as ProductSort | null;
    if (sort && VALID_PRODUCT_SORTS.has(sort)) this.sortMode.set(sort);
  }

  ionViewWillEnter(): void {
    this.salesCatalogStore.loadProducts();
  }

  onSearch(event: CustomEvent) {
    this.searchQuery.set(event.detail.value ?? '');
    this.productDisplayLimit.set(20);
    this.syncQueryParams();
  }

  onSortChange(event: Event) {
    const nextSort = this.getEventValue<ProductSort>(event);
    if (!nextSort) return;
    if (VALID_PRODUCT_SORTS.has(nextSort)) {
      this.sortMode.set(nextSort);
      this.productDisplayLimit.set(20);
      this.syncQueryParams();
    }
  }

  onPriceInput(event: Event): void {
    const rawValue = String(
      (event as CustomEvent<{ value?: string | null }>).detail?.value ?? '',
    );
    const decimalValue = rawValue.replace(',', '.').replace(/[^\d.]/g, '');
    const [integerPart = '', ...decimalParts] = decimalValue.split('.');
    const sanitizedValue = decimalParts.length
      ? `${integerPart}.${decimalParts.join('').slice(0, 2)}`
      : integerPart;

    if (sanitizedValue !== rawValue) {
      this.createProductForm.controls.price.setValue(sanitizedValue, {
        emitEvent: false,
      });
    }
  }

  formatPriceInput(): void {
    const control = this.createProductForm.controls.price;
    const parsedPrice = this.parsePrice(control.value);
    if (parsedPrice === undefined) return;
    if (parsedPrice === null) {
      control.markAsTouched();
      return;
    }

    control.setValue(parsedPrice.toFixed(2), { emitEvent: false });
  }

  loadMoreProducts(event: Event): void {
    this.productDisplayLimit.update((n) => n + 20);
    const target = event.target as { complete?: () => void } | null;
    target?.complete?.();
  }

  openCreateProductModal() {
    this.resetCreateProductForm();
    this.isCreateModalOpen.set(true);
  }

  async closeCreateProductModal(resetForm = true): Promise<void> {
    if (this.productsMutating()) return;
    if (this.createProductForm.dirty && !(await this.confirmDiscard())) return;
    this.isCreateModalOpen.set(false);
    if (resetForm) {
      this.resetCreateProductForm();
    }
  }

  readonly canDismissCreateProduct = async (): Promise<boolean> => {
    if (this.productsMutating()) return false;
    return !this.createProductForm.dirty || this.confirmDiscard();
  };

  onCreateProductModalDidDismiss(): void {
    this.isCreateModalOpen.set(false);
    this.resetCreateProductForm();
    this.mutationError.set(null);
  }

  createProduct() {
    const { name, description, price, type } = this.createProductForm.getRawValue();
    const trimmedName = name.trim();

    if (!trimmedName || this.createProductForm.invalid) {
      if (!trimmedName) {
        this.createProductForm.controls.name.setErrors({ required: true });
      }

      this.createProductForm.markAllAsTouched();
      return;
    }

    const parsedPrice = this.parsePrice(price);
    if (parsedPrice === null) {
      this.createProductForm.controls.price.setErrors({ invalidPrice: true });
      this.createProductForm.controls.price.markAsTouched();
      return;
    }

    this.mutationError.set(null);
    this.salesCatalogStore.addProduct({
      name: trimmedName,
      description: description.trim() || undefined,
      price: parsedPrice,
      type,
    }).subscribe({
      next: () => {
        this.createProductForm.markAsPristine();
        this.isCreateModalOpen.set(false);
      },
      error: () => this.mutationError.set('No se pudo guardar el producto. Conservamos tu borrador para que puedas reintentar.'),
    });
  }

  resetCreateProductForm() {
    this.createProductForm.reset({
      name: '',
      description: '',
      price: '',
      type: ProductType.PRODUCT,
    });
    this.createProductForm.markAsPristine();
    this.createProductForm.markAsUntouched();
  }

  async openEditProductAlert(product: IProduct) {
    const alert = await this.alertCtrl.create({
      header: 'Editar producto',
      inputs: [
        { name: 'name', type: 'text', value: product.name, placeholder: 'Nombre' },
        {
          name: 'description',
          type: 'textarea',
          value: product.description ?? '',
          placeholder: 'Descripción (opcional)',
        },
        {
          name: 'price',
          type: 'text',
          value: product.price?.toString() ?? '',
          placeholder: 'Precio (opcional)',
        },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (data: {
            name?: string;
            description?: string;
            price?: string;
          }) => {
            const name = data.name?.trim() ?? '';
            if (!name) return false;

            const parsedPrice = this.parsePrice(data.price);
            if (parsedPrice === null) return false;

            this.mutationError.set(null);
            this.salesCatalogStore.updateProduct(product.id, {
              name,
              description: data.description?.trim() || undefined,
              price: parsedPrice ?? undefined,
            }).subscribe({
              next: () => void alert.dismiss(),
              error: () => this.mutationError.set('No se pudo actualizar el producto. Inténtalo nuevamente.'),
            });
            return false;
          },
        },
      ],
    });

    await alert.present();
  }

  async deleteProduct(product: IProduct) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar producto',
      message: `¿Eliminar "${product.name}" del catálogo?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.salesCatalogStore.deleteProduct(product.id).subscribe({
              error: () => this.mutationError.set('No se pudo eliminar el producto. Inténtalo nuevamente.'),
            });
          },
        },
      ],
    });

    await alert.present();
  }

  toggleProductType(product: IProduct): void {
    this.salesCatalogStore.updateProduct(product.id, {
      type: product.type === ProductType.SERVICE ? ProductType.PRODUCT : ProductType.SERVICE,
    }).subscribe({
      error: () => this.mutationError.set('No se pudo cambiar el tipo de producto. Inténtalo nuevamente.'),
    });
  }

  private syncQueryParams(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: this.searchQuery().trim() || null,
        sort: this.sortMode() === ProductSort.RECENT ? null : this.sortMode(),
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private async confirmDiscard(): Promise<boolean> {
    const alert = await this.alertCtrl.create({
      header: 'Descartar cambios',
      message: 'Hay información sin guardar. ¿Quieres descartarla?',
      buttons: [
        { text: 'Seguir editando', role: 'cancel' },
        { text: 'Descartar', role: 'destructive' },
      ],
    });
    await alert.present();
    const result = await alert.onDidDismiss();
    return result.role === 'destructive';
  }

  private parsePrice(rawPrice?: string): number | null | undefined {
    const normalized = rawPrice?.trim().replace(',', '.');
    if (!normalized) return undefined;

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed < 0) return null;

    return Math.round(parsed * 100) / 100;
  }

  private getEventValue<T>(event: Event): T | null {
    const value = (event as CustomEvent<{ value?: T }>).detail?.value;
    return value ?? null;
  }
}
