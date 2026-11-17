import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreApiService } from '../services/store-api.service';
import { Order } from '../classes/Order';
import { User } from '../classes/User';

@Component({
  selector: 'app-order-detail-component',
  standalone: false,
  templateUrl: './order-detail-component.html',
  styleUrl: './order-detail-component.css'
})
export class OrderDetailComponent implements OnInit {
  @ViewChild('cancelDialog') cancelDialogRef?: ElementRef<HTMLDialogElement>;

  orderId = 0;
  orderMessage = '';
  orderSuccess = false;

  // Cancel dialog state
  cancelDescription = 'Vui lòng cho ẨN Store biết lý do hủy đơn.';
  reasonChoice = '';
  reasonDetail = '';
  cancelErrorMessage = '';

  // Tab selection for after-sales (prevents 2 file upload inputs from showing at once)
  afterSalesTab: 'return' | 'review' = 'return';

  // Return form state (supports multiple images, requires at least 1)
  returnData = {
    productId: 0,
    type: 'RETURN',
    reason: '',
    evidenceName: null as string | null,
    evidenceImage: null as string | null,
    evidenceImages: [] as string[]
  };
  uploadedEvidences: Array<{ name: string; url: string }> = [];
  returnEvidenceError = '';

  // Review form state
  reviewData = {
    productId: 0,
    rating: 5,
    comment: '',
    imageName: null as string | null
  };

  readonly reviewSuggestions = [
    ['Sản phẩm ổn, đúng mô tả.', 'Sản phẩm ổn'],
    ['Hàng đẹp, đóng gói kỹ, giao nhanh.', 'Đóng gói kỹ'],
    ['Rất hài lòng, sản phẩm chất lượng, sẽ ủng hộ shop tiếp.', 'Rất hài lòng'],
    ['Shop tư vấn nhiệt tình, phản hồi nhanh.', 'Shop nhiệt tình'],
    ['', 'Khác']
  ];

  constructor(
    public store: StoreApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.orderId = Number(params.get('id') || 0);
      this.syncDefaultProducts();
    });
    this.store.orders$.subscribe(() => {
      this.syncDefaultProducts();
    });
  }

  private syncDefaultProducts(): void {
    const ord = this.order;
    if (ord && ord.items.length) {
      if (!this.returnData.productId) this.returnData.productId = ord.items[0].productId;
      if (!this.reviewData.productId) this.reviewData.productId = ord.items[0].productId;
    }
  }

  get user(): User | null {
    return this.store.getCurrentUser();
  }

  get order(): Order | null {
    const ord = this.store.getOrder(this.orderId);
    if (!ord) return null;
    const usr = this.user;
    if (usr) {
      if (ord.userId !== usr.id) return null;
      return ord;
    }
    // No. 25: Khi đã đăng xuất (usr === null), chỉ cho phép xem đơn vãng lai vừa đặt hoặc vừa tra cứu hợp lệ
    if (!this.store.isGuestOrderAuthorized(ord.id)) return null;
    return ord;
  }

  async retryPayment(): Promise<void> {
    const ord = this.order;
    if (!ord) return;
    try {
      const res = await this.store.payOrder(ord.id);
      this.showOrderMessage(res.message, true);
    } catch (err: any) {
      this.showOrderMessage(err?.message || 'Không thể thanh toán lại đơn hàng.', false);
    }
  }

  tryUseLockedRewardPoints(): void {
    const ord = this.order;
    const pts = ord?.pendingRewardPoints || Math.max(10, Math.floor((ord?.total || 0) / 10000));
    if (!this.user) {
      this.showOrderMessage(
        `Điểm thưởng +${pts} Ngọc Ấn đang ở trạng thái Tạm khóa (Chờ kích hoạt). Vui lòng Kích hoạt OTP hoặc Đăng nhập để mở khóa và sử dụng điểm thưởng!`,
        false
      );
      return;
    }
    this.showOrderMessage(`Tài khoản thành viên của bạn đã mở khóa +${pts} Ngọc Ấn từ đơn hàng này!`, true);
  }

  async confirmReceived(): Promise<void> {
    const ord = this.order;
    if (!ord) return;
    try {
      const res = await this.store.confirmOrderReceived(ord.id);
      this.showOrderMessage(res.message, true);
    } catch (err: any) {
      this.showOrderMessage(err?.message || 'Không thể xác nhận đã nhận hàng.', false);
    }
  }

  async simulateExpireReservation(): Promise<void> {
    const ord = this.order;
    if (!ord) return;
    try {
      const msg = await this.store.expireOrderReservation(ord.id);
      this.showOrderMessage(msg, true);
    } catch (err: any) {
      this.showOrderMessage(err?.message || 'Không thể mô phỏng hết hạn giữ tồn kho.', false);
    }
  }

  scrollToReturnForm(): void {
    document.getElementById('return-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  openCancelDialog(order: Order): void {
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
      const result = await this.store.cancelOrder(this.orderId, reason);
      this.closeCancelDialog();
      this.showOrderMessage(result.message, true);
    } catch (err: any) {
      this.cancelErrorMessage = err?.message || 'Không thể hủy đơn hàng.';
    }
  }

  onEvidenceFilesChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    this.returnEvidenceError = '';
    Array.from(files).forEach((file) => {
      this.compressImageFile(file, 900, 0.78)
        .then((compressedDataUrl) => {
          this.uploadedEvidences.push({
            name: file.name,
            url: compressedDataUrl
          });
        })
        .catch(() => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              this.uploadedEvidences.push({
                name: file.name,
                url: reader.result
              });
            }
          };
          reader.readAsDataURL(file);
        });
    });
    // Reset file input value so user can pick more or re-select
    input.value = '';
  }

  private compressImageFile(file: File, maxDim = 900, quality = 0.78): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('File read error'));
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.onerror = () => resolve(dataUrl);
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  removeEvidence(index: number): void {
    this.uploadedEvidences.splice(index, 1);
  }

  onReviewFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.reviewData.imageName = input.files?.[0]?.name || null;
  }

  applyReviewSuggestion(text: string): void {
    this.reviewData.comment = text;
  }

  async onSubmitReturn(): Promise<void> {
    const ord = this.order;
    if (!ord) return;
    if (!this.uploadedEvidences || this.uploadedEvidences.length === 0) {
      this.returnEvidenceError = 'Bắt buộc phải tải lên ít nhất 01 hình ảnh minh chứng tình trạng sản phẩm mới được yêu cầu đổi/trả.';
      this.showOrderMessage(this.returnEvidenceError, false);
      return;
    }
    if (!this.returnData.reason || this.returnData.reason.trim().length < 5) {
      this.showOrderMessage('Vui lòng nhập lý do đổi/trả chi tiết (tối thiểu 5 ký tự).', false);
      return;
    }
    try {
      const imageUrls = this.uploadedEvidences.map((e) => e.url);
      const names = this.uploadedEvidences.map((e) => e.name).join(', ');
      await this.store.submitReturnRequest({
        orderId: ord.id,
        productId: Number(this.returnData.productId),
        type: this.returnData.type,
        reason: this.returnData.reason.trim(),
        evidenceName: names,
        evidenceImage: imageUrls[0] || null,
        evidenceImages: imageUrls
      });
      this.returnData.reason = '';
      this.uploadedEvidences = [];
      this.returnEvidenceError = '';
      this.showOrderMessage('Đã gửi yêu cầu đổi/trả kèm ' + imageUrls.length + ' ảnh minh chứng thành công. Trạng thái: Chờ duyệt.', true);
    } catch (err: any) {
      this.showOrderMessage(err?.message || 'Không thể gửi yêu cầu đổi/trả.', false);
    }
  }

  async onSubmitReview(): Promise<void> {
    const ord = this.order;
    if (!ord) return;
    try {
      await this.store.submitReview({
        orderId: ord.id,
        productId: Number(this.reviewData.productId),
        rating: Number(this.reviewData.rating),
        comment: this.reviewData.comment,
        imageName: this.reviewData.imageName
      });
      this.reviewData.comment = '';
      this.reviewData.imageName = null;
      this.showOrderMessage('Đánh giá đã được ghi nhận.', true);
    } catch (err: any) {
      this.showOrderMessage(err?.message || 'Không thể gửi đánh giá.', false);
    }
  }

  private showOrderMessage(message: string, success = false): void {
    this.orderMessage = message;
    this.orderSuccess = success;
    this.store.showToast(message, !success);
  }
}
