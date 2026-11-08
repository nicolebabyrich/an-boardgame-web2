import { Component, ElementRef, ViewChild } from '@angular/core';
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

  // Cancel dialog state
  cancelOrderId = 0;
  cancelDescription = 'Vui lòng cho ẨN Store biết lý do hủy đơn.';
  reasonChoice = '';
  reasonDetail = '';
  cancelErrorMessage = '';

  constructor(
    public store: StoreApiService,
    private router: Router
  ) {}

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
