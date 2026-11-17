import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { StoreApiService } from '../services/store-api.service';
import { Product } from '../classes/Product';
import { Review } from '../classes/Review';

@Component({
  selector: 'app-product-detail-component',
  standalone: false,
  templateUrl: './product-detail-component.html',
  styleUrl: './product-detail-component.css'
})
export class ProductDetailComponent implements OnInit {
  productId = 1;
  activeImageIndex = 0;
  quantity = 1;
  selectedAttribute = 'Bản Tiêu Chuẩn';

  constructor(
    public store: StoreApiService,
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('id') || this.route.snapshot.queryParamMap.get('id');
      this.productId = Number(idParam || 1);
      this.activeImageIndex = 0;
      this.quantity = 1;
      const p = this.product;
      this.selectedAttribute = this.availableAttributes[0] || 'Bản Tiêu Chuẩn';
      if (p?.model3d) {
        this.store.ensureModelViewerLoaded();
      }
    });
  }

  get product(): Product | null {
    return this.store.getProduct(this.productId);
  }

  get soldOut(): boolean {
    const p = this.product;
    return !p || p.status === 'OUT_OF_STOCK' || p.stock <= 0;
  }

  get relatedProducts(): Product[] {
    const p = this.product;
    if (!p) return [];
    return this.store
      .getProducts()
      .filter((item) => item.category === p.category && item.id !== p.id)
      .slice(0, 4);
  }

  get reviews(): Review[] {
    return this.store.getProductReviews(this.productId);
  }

  get stockPercent(): number {
    const p = this.product;
    if (!p) return 0;
    const baseline = Math.max(p.stock, 40);
    return Math.max(0, Math.min(100, Math.round((p.stock / baseline) * 100)));
  }

  get stockLabel(): string {
    const p = this.product;
    if (!p || p.stock <= 0) return 'Hết hàng';
    if (p.stock <= 5) return 'Sắp hết hàng';
    return 'Còn hàng';
  }

  selectGalleryImage(index: number): void {
    this.activeImageIndex = index;
  }

  prevImage(): void {
    const p = this.product;
    if (!p || !p.images.length) return;
    this.activeImageIndex = (this.activeImageIndex - 1 + p.images.length) % p.images.length;
  }

  nextImage(): void {
    const p = this.product;
    if (!p || !p.images.length) return;
    this.activeImageIndex = (this.activeImageIndex + 1) % p.images.length;
  }

  changeQuantity(delta: number): void {
    const p = this.product;
    const max = p ? Math.max(1, p.stock) : 99;
    this.quantity = Math.max(1, Math.min(max, Number(this.quantity) + delta));
  }

  get availableAttributes(): string[] {
    const p = this.product;
    if (!p) return ['Bản Tiêu Chuẩn'];
    if (p.slug.includes('ao-thun')) {
      return ['Size M (Tiêu chuẩn)', 'Size L (Oversize)', 'Size XL (Cổ phục)'];
    }
    if (p.category === 'merchandise') {
      return ['Bản Tiêu Chuẩn', 'Bản Đóng Hộp Quà Tặng', 'Bản Kèm Thiệp Cổ Phong'];
    }
    return ['Bản Tiêu Chuẩn', 'Bản Đặc Biệt (Hộp dấu sáp)', 'Bản Sưu Tầm (Kèm chữ ký)'];
  }

  addToCart(productId?: number, qty?: number): void {
    const targetId = productId ?? this.productId;
    const targetQty = qty ?? this.quantity;
    try {
      this.store.addToCart(targetId, targetQty, this.selectedAttribute);
      this.store.showToast(`Đã thêm (${this.selectedAttribute}) vào giỏ hàng.`, false, 'Xem giỏ hàng', '/cart');
    } catch (err: any) {
      this.store.showToast(err.message || 'Không thể thêm vào giỏ.', true);
    }
  }

  buyNow(targetProductId?: number): void {
    const targetId = targetProductId ?? this.productId;
    const targetQty = targetProductId ? 1 : this.quantity;
    try {
      this.store.addToCart(targetId, targetQty, this.selectedAttribute);
      this.router.navigate(['/checkout']);
    } catch (err: any) {
      this.store.showToast(err.message || 'Không thể mua ngay.', true);
    }
  }

  open3DModal(): void {
    const p = this.product;
    if (!p || !p.model3d) return;
    this.store.open3DModelModal(p.name, p.model3d, p.images[0]);
  }

  modelViewerPreviewHtml(): SafeHtml {
    const p = this.product;
    if (!p || !p.model3d) return '';
    return this.sanitizer.bypassSecurityTrustHtml(`
      <model-viewer class="product-model-preview" src="${p.model3d}" poster="${p.images[0]}" camera-controls auto-rotate ar shadow-intensity="0.85" exposure="1" alt="Mô hình 3D ${p.name}">
        <div class="model-viewer-fallback" slot="poster"><p>Đang mở mô hình 3D...</p></div>
      </model-viewer>
    `);
  }

  starsText(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(Math.max(0, 5 - rating));
  }
}
