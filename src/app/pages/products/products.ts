import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { addIcons } from 'ionicons';
import {
  addOutline,
  arrowBackOutline,
  cashOutline,
  createOutline,
  pricetagOutline,
  swapVerticalOutline,
  trashOutline,
} from 'ionicons/icons';
import {
  AlertController,
  IonBackButton,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { IProduct } from '../../interfaces/product.interface';
import { COMMON_ION_PAGE_IMPORTS } from '../../shared/ionic-imports';
import { SalesCatalogStore } from '../../shared/stores/sales-catalog.store';

type ProductSort = 'recent' | 'price-desc' | 'price-asc' | 'name';

@Component({
  selector: 'app-products',
  host: { class: 'ion-page' },
  imports: [
    ...COMMON_ION_PAGE_IMPORTS,
    IonBackButton,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
  ],
  templateUrl: './products.html',
  styleUrl: './products.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsPage {
  private readonly alertCtrl = inject(AlertController);
  private readonly salesCatalogStore = inject(SalesCatalogStore);
  private readonly priceFormatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  });

  readonly products = this.salesCatalogStore.products;

  readonly searchQuery = signal('');
  readonly sortMode = signal<ProductSort>('recent');

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
      if (sort === 'name') return a.name.localeCompare(b.name, 'es');
      if (sort === 'price-desc') return (b.price ?? -1) - (a.price ?? -1);
      if (sort === 'price-asc') return (a.price ?? Number.MAX_VALUE) - (b.price ?? Number.MAX_VALUE);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  });

  constructor() {
    addIcons({
      addOutline,
      arrowBackOutline,
      cashOutline,
      createOutline,
      pricetagOutline,
      swapVerticalOutline,
      trashOutline,
    });
  }

  onSearch(event: CustomEvent) {
    this.searchQuery.set(event.detail.value ?? '');
  }

  onSortChange(event: CustomEvent) {
    const nextSort = event.detail.value as ProductSort;
    if (
      nextSort === 'recent' ||
      nextSort === 'price-desc' ||
      nextSort === 'price-asc' ||
      nextSort === 'name'
    ) {
      this.sortMode.set(nextSort);
    }
  }

  formatPrice(price?: number): string {
    if (price === undefined) return 'Sin precio';
    return this.priceFormatter.format(price);
  }

  formatDate(dateIso: string): string {
    return new Date(dateIso).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  async openCreateProductAlert() {
    const alert = await this.alertCtrl.create({
      header: 'Nuevo producto',
      message: 'Agrega un producto o servicio al catálogo.',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Nombre' },
        { name: 'description', type: 'textarea', placeholder: 'Descripción (opcional)' },
        { name: 'price', type: 'text', placeholder: 'Precio (opcional)' },
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

            this.salesCatalogStore.addProduct({
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
}
