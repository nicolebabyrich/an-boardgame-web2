import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreApiService } from '../services/store-api.service';
import { Product } from '../classes/Product';

@Component({
  selector: 'app-product-list-component',
  standalone: false,
  templateUrl: './product-list-component.html',
  styleUrl: './product-list-component.css'
})
export class ProductListComponent implements OnInit {
  search = '';
  category = 'all';
  minPrice = 0;
  maxPrice = 1500000;
  sort = 'newest';
  currentPage = 1;
  readonly pageSize = 6;

  constructor(
    public store: StoreApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.search = params.get('search') || '';
      this.category = params.get('category') || 'all';
      this.minPrice = Number(params.get('min') || 0);
      this.maxPrice = Number(params.get('max') || 1500000);
      this.sort = params.get('sort') || 'newest';
      this.currentPage = Math.max(1, Number(params.get('page') || 1));
    });
  }

  get filteredProducts(): Product[] {
    const keyword = this.search.trim().toLowerCase();
    const list = this.store.getProducts().filter((product) => {
      const currentPrice = product.discountPrice ?? product.price;
      return product.name.toLowerCase().includes(keyword)
        && (this.category === 'all' || product.category === this.category)
        && currentPrice >= this.minPrice
        && currentPrice <= this.maxPrice;
    });

    return [...list].sort((a, b) => {
      if (this.sort === 'price-asc') return (a.discountPrice ?? a.price) - (b.discountPrice ?? b.price);
      if (this.sort === 'price-desc') return (b.discountPrice ?? b.price) - (a.discountPrice ?? a.price);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredProducts.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get paginatedProducts(): Product[] {
    const safePage = Math.min(this.currentPage, this.totalPages);
    const start = (safePage - 1) * this.pageSize;
    return this.filteredProducts.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    window.scrollTo({ top: 220, behavior: 'smooth' });
  }

  onPriceSliderChange(): void {
    if (this.minPrice > this.maxPrice) {
      this.minPrice = this.maxPrice;
    }
    this.currentPage = 1;
  }

  applyFilter(): void {
    this.currentPage = 1;
    const queryParams: any = {};
    if (this.search.trim()) queryParams.search = this.search.trim();
    if (this.category && this.category !== 'all') queryParams.category = this.category;
    if (this.minPrice > 0) queryParams.min = this.minPrice;
    if (this.maxPrice < 1500000) queryParams.max = this.maxPrice;
    if (this.sort && this.sort !== 'newest') queryParams.sort = this.sort;
    this.router.navigate(['/products'], { queryParams });
  }

  resetFilter(): void {
    this.search = '';
    this.category = 'all';
    this.minPrice = 0;
    this.maxPrice = 1500000;
    this.sort = 'newest';
    this.currentPage = 1;
    this.router.navigate(['/products']);
  }

  isSoldOut(product: Product): boolean {
    return product.status === 'OUT_OF_STOCK' || product.stock <= 0;
  }

  addToCart(productId: number): void {
    try {
      this.store.addToCart(productId, 1, 'Bản Tiêu Chuẩn');
      this.store.showToast('Đã thêm sản phẩm vào giỏ hàng.', false, 'Xem giỏ hàng', '/cart');
    } catch (err: any) {
      this.store.showToast(err.message || 'Không thể thêm vào giỏ.', true);
    }
  }

  buyNow(productId: number): void {
    try {
      this.store.addToCart(productId, 1, 'Bản Tiêu Chuẩn');
      this.router.navigate(['/checkout']);
    } catch (err: any) {
      this.store.showToast(err.message || 'Không thể mua ngay sản phẩm này.', true);
    }
  }
}
