import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
  IonFab,
  IonFabButton,
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
import { AuthService } from '../../core/services/auth.service';
import { ProductSort } from './enums/product-sort.enum';
import { VALID_PRODUCT_SORTS } from './constants/product-sort.constants';

@Component({
  selector: 'app-products',
  host: { class: 'ion-page' },
  imports: [
    ReactiveFormsModule,
    ...COMMON_ION_PAGE_IMPORTS,
    IonBackButton,
    IonFab,
    IonFabButton,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    FormatDatePipe,
    FormatPricePipe,
  ],
  templateUrl: './products.html',
  styleUrl: './products.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsPage {
  private readonly fb = inject(FormBuilder);
  private readonly alertCtrl = inject(AlertController);
  private readonly salesCatalogStore = inject(SalesCatalogStore);
  private readonly authService = inject(AuthService);
  private readonly priceFormatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  });

  readonly products = this.salesCatalogStore.products;

  readonly isCreateModalOpen = signal(false);
  readonly productDisplayLimit = signal(20);
  readonly searchQuery = signal('');
  readonly sortMode = signal<ProductSort>(ProductSort.RECENT);
  readonly createProductForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    description: ['', [Validators.maxLength(280)]],
    price: ['', [Validators.pattern(/^\d+([.,]\d{1,2})?$/)]],
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
  }

  ionViewWillEnter(): void {
    const userId = this.authService.currentUser()?.userId;
    if (userId) {
      this.salesCatalogStore.loadProducts(userId);
    }
  }

  onSearch(event: CustomEvent) {
    this.searchQuery.set(event.detail.value ?? '');
    this.productDisplayLimit.set(20);
  }

  onSortChange(event: Event) {
    const nextSort = this.getEventValue<ProductSort>(event);
    if (!nextSort) return;
    if (VALID_PRODUCT_SORTS.has(nextSort)) {
      this.sortMode.set(nextSort);
      this.productDisplayLimit.set(20);
    }
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

  closeCreateProductModal(resetForm = true) {
    this.isCreateModalOpen.set(false);
    if (resetForm) {
      this.resetCreateProductForm();
    }
  }

  createProduct() {
    const { name, description, price } = this.createProductForm.getRawValue();
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

    this.salesCatalogStore.addProduct({
      name: trimmedName,
      description: description.trim() || undefined,
      price: parsedPrice,
      userId: this.authService.currentUser()?.userId,
    });

    this.closeCreateProductModal();
  }

  resetCreateProductForm() {
    this.createProductForm.reset({
      name: '',
      description: '',
      price: '',
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

            this.salesCatalogStore.updateProduct(product.id, {
              name,
              description: data.description?.trim() || undefined,
              price: parsedPrice ?? undefined,
            });
            return true;
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
            this.salesCatalogStore.deleteProduct(product.id);
          },
        },
      ],
    });

    await alert.present();
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
