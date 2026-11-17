import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { StoreApiService } from '../services/store-api.service';
import { CartItem } from '../classes/CartItem';
import { Product } from '../classes/Product';

@Component({
  selector: 'app-cart-component',
  standalone: false,
  templateUrl: './cart-component.html',
  styleUrl: './cart-component.css'
})
export class CartComponent implements OnInit, OnDestroy {
  @ViewChild('removeDialog') removeDialog?: ElementRef<HTMLDialogElement>;
  cartMessage = '';
  pendingRemoveProductId: number | null = null;
  holdSecondsRemaining = 15 * 60;
  private timerHandle: any = null;

  constructor(
    public store: StoreApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.timerHandle = setInterval(() => {
      if (this.holdSecondsRemaining > 0) {
        this.holdSecondsRemaining--;
      } else {
        this.holdSecondsRemaining = 15 * 60;
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
    }
  }

  get holdTimerText(): string {
    const mins = Math.floor(this.holdSecondsRemaining / 60);
    const secs = this.holdSecondsRemaining % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  get items(): CartItem[] {
    return this.store.getCartItems();
  }

  get summary() {
    return this.store.cartSummary();
  }

  get selectedCount(): number {
    return this.items.filter((i) => i.selected).length;
  }

  get allSelected(): boolean {
    return this.items.length > 0 && this.selectedCount === this.items.length;
  }

  getAttributeOptions(prod: Product): string[] {
    if (prod.slug.includes('ao-thun')) {
      return ['Size M (Tiêu chuẩn)', 'Size L (Oversize)', 'Size XL (Cổ phục)'];
    }
    if (prod.category === 'merchandise') {
      return ['Bản Tiêu Chuẩn', 'Bản Đóng Hộp Quà Tặng', 'Bản Kèm Thiệp Cổ Phong'];
    }
    return ['Bản Tiêu Chuẩn', 'Bản Đặc Biệt (Hộp dấu sáp)', 'Bản Sưu Tầm (Kèm chữ ký)'];
  }

  onAttributeChange(productId: number, event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.store.updateCartAttribute(productId, val);
    this.store.showToast(`Đã cập nhật phân loại: ${val}`);
  }

  toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.store.setAllCartItemsSelected(checked);
  }

  toggleItem(productId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.store.setCartItemSelected(productId, checked);
  }

  increase(item: CartItem): void {
    this.cartMessage = '';
    try {
      this.store.updateCartQuantity(item.productId, item.quantity + 1);
    } catch (err: any) {
      this.cartMessage = err.message;
    }
  }

  decrease(item: CartItem): void {
    this.cartMessage = '';
    if (item.quantity <= 1) {
      this.requestRemove(item.productId);
      return;
    }
    try {
      this.store.updateCartQuantity(item.productId, item.quantity - 1);
    } catch (err: any) {
      this.cartMessage = err.message;
    }
  }

  onQuantityChange(item: CartItem, event: Event): void {
    this.cartMessage = '';
    const val = Number((event.target as HTMLInputElement).value);
    if (val < 1) {
      this.requestRemove(item.productId);
      return;
    }
    try {
      this.store.updateCartQuantity(item.productId, val);
    } catch (err: any) {
      this.cartMessage = err.message;
    }
  }

  requestRemove(productId: number): void {
    this.pendingRemoveProductId = productId;
    const dlg = this.removeDialog?.nativeElement;
    if (dlg && typeof dlg.showModal === 'function') {
      dlg.showModal();
    } else if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm khỏi giỏ hàng?')) {
      this.store.removeFromCart(productId);
    }
  }

  closeRemoveDialog(): void {
    this.removeDialog?.nativeElement?.close();
    this.pendingRemoveProductId = null;
  }

  confirmRemove(): void {
    if (this.pendingRemoveProductId !== null) {
      this.store.removeFromCart(this.pendingRemoveProductId);
    }
    this.closeRemoveDialog();
  }
}
