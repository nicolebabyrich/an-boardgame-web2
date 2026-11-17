import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { StoreApiService } from '../services/store-api.service';
import { Order } from '../classes/Order';
import { User } from '../classes/User';

@Component({
  selector: 'app-orders-component',
  standalone: false,
  templateUrl: './orders-component.html',
  styleUrl: './orders-component.css'
})
export class OrdersComponent {
  @ViewChild('cancelDialog') cancelDialogRef?: ElementRef<HTMLDialogElement>;

  statusFilter: 'ALL' | 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED' = 'ALL';
  readonly statusTabs: Array<{ key: 'ALL' | 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED'; label: string }> = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'PENDING', label: 'Chờ xác nhận' },
    { key: 'CONFIRMED', label: 'Đã xác nhận' },
    { key: 'SHIPPING', label: 'Đang giao' },
    { key: 'DELIVERED', label: 'Đã giao' },
    { key: 'CANCELLED', label: 'Đã hủy' }
  ];

  orderMessage = '';
  orderSuccess = false;

  // Tra cứu đơn hàng bảo mật bằng Mã đơn hàng + SĐT nhận hàng (G20, G21, G22)
  guestLookupCode = '';
  guestLookupPhone = '';
  guestLookupResults: Order[] = [];
  guestLookupSearched = false;
  guestLookupError = '';

  // G28: Gửi phiếu hỗ trợ / khiếu nại gắn với mã đơn hàng cho khách vãng lai
  guestSupportOrderCode = '';
  guestSupportPhone = '';
  guestSupportMessage = '';
  guestSupportNotice = '';

  // Cancel dialog state
  cancelOrderId = 0;
  cancelDescription = 'Vui lòng cho ẨN Store biết lý do hủy đơn.';
  reasonChoice = '';
  reasonDetail = '';
  cancelErrorMessage = '';

  constructor(
    public store: StoreApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  get sampleGuestOrder(): Order | null {
    return this.store.orders$.value[0] || null;
  }

  fillSampleLookup(mode: 'valid' | 'wrongCode' | 'wrongPhone'): void {
    const sample = this.sampleGuestOrder;
    const realCode = sample?.code || 'AN202606280001';
    const realPhone = sample?.address?.receiverPhone || '0704477397';
    if (mode === 'valid') {
      this.guestLookupCode = realCode;
      this.guestLookupPhone = realPhone;
    } else if (mode === 'wrongCode') {
      this.guestLookupCode = 'AN9999999999';
      this.guestLookupPhone = realPhone;
    } else {
      this.guestLookupCode = realCode;
      this.guestLookupPhone = '0988999888';
    }
    this.onLookupGuestOrder();
  }

  async onLookupGuestOrder(): Promise<void> {
    this.guestLookupError = '';
    this.guestLookupResults = [];
    const code = this.guestLookupCode.trim().toUpperCase();
    const phone = this.guestLookupPhone.trim();
    if (!code || !phone) {
      this.guestLookupError = 'Vui lòng nhập đầy đủ cả Mã đơn hàng (VD: AN2026...) và Số điện thoại nhận hàng để xác thực.';
      this.cdr.detectChanges();
      return;
    }
    try {
      this.guestLookupResults = await this.store.lookupGuestOrders(code, phone);
      this.guestLookupSearched = true;
      if (this.guestLookupResults[0]) {
        this.guestSupportOrderCode = this.guestLookupResults[0].code;
        this.guestSupportPhone = this.guestLookupResults[0].address.receiverPhone;
      }
    } catch (err: any) {
      this.guestLookupSearched = true;
      this.guestLookupError = err?.message || 'Không thể tra cứu đơn hàng.';
    } finally {
      this.cdr.detectChanges();
    }
  }

  async onSubmitGuestSupportTicket(): Promise<void> {
    this.guestSupportNotice = '';
    const code = this.guestSupportOrderCode.trim().toUpperCase();
    const phone = this.guestSupportPhone.trim();
    const msg = this.guestSupportMessage.trim();
    if (!code || !phone || !msg) {
      this.showOrderMessage('Vui lòng nhập Mã đơn hàng, SĐT và nội dung cần hỗ trợ.', false);
      return;
    }
    await this.store.createAdvisorTicket({
      customerName: `Khách vãng lai (Đơn ${code})`,
      customerPhone: phone,
      emotionLevel: 'ORANGE',
      emotionLabel: `Cam — Hỗ trợ đơn hàng ${code}`,
      originalMessage: `[Mã đơn: ${code}] ${msg}`,
      softenedMessage: `Khách vãng lai (SĐT ${phone}) gửi yêu cầu hỗ trợ cho đơn hàng ${code}: "${msg}"`
    });
    this.guestSupportMessage = '';
    this.guestSupportNotice = `Đã ghi nhận yêu cầu hỗ trợ gắn với mã đơn ${code}! Tư vấn viên sẽ liên hệ qua SĐT ${phone}.`;
    this.showOrderMessage(this.guestSupportNotice, true);
    this.cdr.detectChanges();
  }

  async simulateExpireReservation(orderId: number): Promise<void> {
    try {
      const msg = await this.store.expireOrderReservation(orderId);
      this.showOrderMessage(msg, true);
      if (this.guestLookupSearched && this.guestLookupCode.trim() && this.guestLookupPhone.trim()) {
        this.guestLookupResults = await this.store.lookupGuestOrders(
          this.guestLookupCode.trim(),
          this.guestLookupPhone.trim()
        );
      }
    } catch (err: any) {
      this.showOrderMessage(err?.message || 'Không thể giải phóng tồn kho.', false);
    } finally {
      this.cdr.detectChanges();
    }
  }

  get user(): User | null {
    return this.store.getCurrentUser();
  }

  get allOrders(): Order[] {
    return this.store.getMyOrders();
  }

  get orders(): Order[] {
    if (this.statusFilter === 'ALL') return this.allOrders;
    return this.allOrders.filter((o) => o.status === this.statusFilter);
  }

  getCountByStatus(status: string): number {
    if (status === 'ALL') return this.allOrders.length;
    return this.allOrders.filter((o) => o.status === status).length;
  }

  canRequestCancellation(order: Order): boolean {
    return ['PENDING', 'CONFIRMED'].includes(order.status)
      && order.cancellationRequest?.status !== 'PENDING';
  }

  cancellationLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: 'Yêu cầu hủy đang chờ duyệt',
      APPROVED: 'Yêu cầu hủy đã được duyệt',
      REJECTED: 'Yêu cầu hủy đã bị từ chối'
    };
    return labels[status] || 'Yêu cầu hủy';
  }

  reorder(orderId: number): void {
    try {
      this.store.reorder(orderId);
      this.router.navigate(['/cart']);
    } catch (err: any) {
      this.showOrderMessage(err?.message || 'Không thể mua lại đơn hàng.', false);
    }
  }

  async confirmReceived(orderId: number): Promise<void> {
    try {
      const res = await this.store.confirmOrderReceived(orderId);
      this.showOrderMessage(res.message, true);
    } catch (err: any) {
      this.showOrderMessage(err?.message || 'Không thể xác nhận đã nhận hàng.', false);
    }
  }

  goToReturnRequest(orderId: number): void {
    this.router.navigate(['/orders', orderId], { queryParams: { action: 'return' } });
  }

  openCancelDialog(order: Order): void {
    this.cancelOrderId = order.id;
    this.reasonChoice = '';
    this.reasonDetail = '';
    this.cancelErrorMessage = '';
    this.cancelDescription = order.status === 'PENDING'
      ? 'Đơn đang chờ xác nhận và sẽ được hủy ngay sau khi bạn xác nhận.'
      : 'Đơn đã được xử lý; yêu cầu hủy sẽ được gửi đến quản trị viên để xét duyệt.';
    this.cancelDialogRef?.nativeElement.showModal();
  }

  closeCancelDialog(): void {
    this.cancelDialogRef?.nativeElement.close();
  }

  async submitCancelOrder(): Promise<void> {
    this.cancelErrorMessage = '';
    const reason = this.reasonChoice === 'OTHER' ? this.reasonDetail.trim() : this.reasonChoice;
    if (!reason || reason.length < 5) {
      this.cancelErrorMessage = 'Vui lòng chọn hoặc nhập lý do hủy đơn (tối thiểu 5 ký tự).';
      return;
    }
    try {
      const result = await this.store.cancelOrder(this.cancelOrderId, reason);
      this.closeCancelDialog();
      this.showOrderMessage(result.message, true);
    } catch (err: any) {
      this.cancelErrorMessage = err?.message || 'Không thể hủy đơn hàng.';
    }
  }

  private showOrderMessage(message: string, success = false): void {
    this.orderMessage = message;
    this.orderSuccess = success;
    this.store.showToast(message, !success);
  }
}
