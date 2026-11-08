import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreApiService } from '../services/store-api.service';
import { Address } from '../classes/Address';
import { Voucher } from '../classes/Voucher';

@Component({
  selector: 'app-checkout-component',
  standalone: false,
  templateUrl: './checkout-component.html',
  styleUrl: './checkout-component.css'
})
export class CheckoutComponent implements OnInit {
  selectedAddressId = 0;
  voucherInput = '';
  appliedVoucherCode = '';
  voucherMessage = '';
  voucherSuccess = false;
  paymentMethod = 'COD';
  checkoutMessage = '';
  showQrModal = false;
  qrError = false;

  guestInfo = {
    fullName: '',
    phone: '',
    email: '',
    province: 'Thành phố Hồ Chí Minh',
    ward: '',
    detailAddress: ''
  };

  constructor(
    public store: StoreApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const def = this.addresses.find((a) => a.isDefault) || this.addresses[0];
    if (def) this.selectedAddressId = def.id;

    this.route.queryParamMap.subscribe((params) => {
      const v = params.get('voucher') || '';
      if (v) {
        this.voucherInput = v;
        this.applyVoucher();
      }
    });
  }

  get addresses(): Address[] {
    const list = this.store.getUserAddresses();
    if (!this.selectedAddressId && list.length > 0) {
      const def = list.find((a) => a.isDefault) || list[0];
      this.selectedAddressId = def.id;
    }
    return list;
  }

  get availableVouchers(): Voucher[] {
    return this.store.vouchers$.value.filter((v) => v.status === 'ACTIVE');
  }

  get summary() {
    try {
      return this.store.cartSummary(this.appliedVoucherCode);
    } catch {
      return this.store.cartSummary('');
    }
  }

  formatAddressLine(address: Address): string {
    return [address.detailAddress, address.ward, address.district, address.province]
      .filter(Boolean)
      .join(', ');
  }

  copyAndSelectVoucher(code: string): void {
    this.store.copyVoucherCode(code);
    this.voucherInput = code;
    this.applyVoucher();
  }

  applyVoucher(): void {
    const code = this.voucherInput.trim().toUpperCase();
    if (!code) {
      this.appliedVoucherCode = '';
      this.voucherMessage = 'Vui lòng nhập mã voucher.';
      this.voucherSuccess = false;
      return;
    }
    try {
      const currentSubtotal = this.store.cartSummary('').subtotal;
      const res = this.store.validateVoucherLocal(code, currentSubtotal);
      this.appliedVoucherCode = res.voucher.code;
      this.voucherMessage = `Đã áp dụng mã ${res.voucher.code} (Mỗi tài khoản chỉ áp dụng 1 lần).`;
      this.voucherSuccess = true;
    } catch (err: any) {
      this.appliedVoucherCode = '';
      this.voucherMessage = err.message;
      this.voucherSuccess = false;
    }
  }

  async submitOrder(): Promise<void> {
    this.checkoutMessage = '';
    const user = this.store.getCurrentUser();

    if (!user) {
      if (!this.store.isValidName(this.guestInfo.fullName)) {
        this.checkoutMessage = 'Vui lòng nhập họ tên người nhận hợp lệ (từ 2 ký tự trở lên).';
        return;
      }
      if (!this.store.isValidPhone(this.guestInfo.phone)) {
        this.checkoutMessage = 'Số điện thoại nhận hàng phải gồm 10 chữ số hợp lệ.';
        return;
      }
      if (!this.store.isValidEmail(this.guestInfo.email)) {
        this.checkoutMessage = 'Vui lòng nhập email hợp lệ để nhận xác nhận đơn hàng & mã OTP.';
        return;
      }
      if (!this.guestInfo.province.trim() || !this.guestInfo.ward.trim() || !this.guestInfo.detailAddress.trim()) {
        this.checkoutMessage = 'Vui lòng điền đầy đủ Tỉnh/Thành, Phường/Xã và Địa chỉ chi tiết.';
        return;
      }
    }

    try {
      const result = await this.store.checkoutOrder({
        addressId: user ? this.selectedAddressId : undefined,
        guestInfo: !user ? this.guestInfo : undefined,
        paymentMethod: this.paymentMethod,
        voucherCode: this.appliedVoucherCode
      });
      if (result.success) {
        const queryParams: any = {
          code: result.code,
          orderId: result.orderId || result.order?.id || 1,
          method: result.paymentMethod
        };
        if (result.guestActivationInfo) {
          queryParams.guestEmail = result.guestActivationInfo.email;
          queryParams.guestOtp = result.guestActivationInfo.otp;
          queryParams.guestLink = result.guestActivationInfo.activationLink;
        }
        this.router.navigate(['/checkout-success'], { queryParams });
      } else {
        this.checkoutMessage = (result.message || 'Thanh toán thất bại.') + ' Mã thử: ' + result.code;
      }
    } catch (err: any) {
      this.checkoutMessage = err.message;
    }
  }
}
