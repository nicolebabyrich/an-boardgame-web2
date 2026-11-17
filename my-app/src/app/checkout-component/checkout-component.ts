import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreApiService } from '../services/store-api.service';
import { AddressApiService, ProvinceOption, WardOption } from '../services/address-api.service';
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
  guestErrors: Record<string, string> = {};
  provinces: ProvinceOption[] = [];
  wards: WardOption[] = [];
  loadingWards = false;

  constructor(
    public store: StoreApiService,
    private addressApi: AddressApiService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    const def = this.addresses.find((a) => a.isDefault) || this.addresses[0];
    if (def) this.selectedAddressId = def.id;

    this.route.queryParamMap.subscribe((params) => {
      const v = params.get('voucher') || '';
      if (v) {
        this.voucherInput = v;
        this.applyVoucher();
      }
    });

    this.provinces = await this.addressApi.getProvinces();
    await this.onGuestProvinceChange();
    this.cdr.detectChanges();
  }

  async onGuestProvinceChange(): Promise<void> {
    this.validateGuestField('province', false);
    const matched = this.provinces.find(
      (p) => p.name.toLowerCase() === String(this.guestInfo.province || '').trim().toLowerCase()
    );
    if (!matched) {
      this.wards = [];
      return;
    }
    this.loadingWards = true;
    this.wards = await this.addressApi.getWards(matched.code);
    this.loadingWards = false;
    this.cdr.detectChanges();
  }

  validateGuestField(field: string, showWhenEmpty = false): boolean {
    const val = String((this.guestInfo as any)[field] || '').trim();
    if (!val && !showWhenEmpty) {
      delete this.guestErrors[field];
      return true;
    }
    let msg = '';
    if (field === 'fullName') {
      msg = this.store.isValidName(val)
        ? ''
        : 'Vui lòng nhập họ tên người nhận hợp lệ (từ 2 ký tự trở lên, không chứa số).';
    } else if (field === 'phone') {
      msg = this.store.isValidPhone(val)
        ? ''
        : 'Số điện thoại nhận hàng phải gồm 10 chữ số hợp lệ (bắt đầu 03/05/07/08/09).';
    } else if (field === 'email') {
      msg = this.store.isValidEmail(val)
        ? ''
        : 'Vui lòng nhập email hợp lệ để nhận xác nhận đơn hàng & mã OTP.';
    } else if (field === 'province') {
      msg = val ? '' : 'Vui lòng chọn hoặc nhập Tỉnh/Thành phố.';
    } else if (field === 'ward') {
      msg = val ? '' : 'Vui lòng chọn hoặc nhập Phường/Xã.';
    } else if (field === 'detailAddress') {
      msg = val.length >= 5 ? '' : 'Địa chỉ chi tiết phải có ít nhất 5 ký tự.';
    }
    if (msg) {
      this.guestErrors[field] = msg;
      return false;
    }
    delete this.guestErrors[field];
    return true;
  }

  validateAllGuestFields(): boolean {
    const fields = ['fullName', 'phone', 'email', 'province', 'ward', 'detailAddress'];
    let ok = true;
    for (const f of fields) {
      if (!this.validateGuestField(f, true)) ok = false;
    }
    return ok;
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

  get flashSaleEndedItems(): string[] {
    return this.summary.items
      .filter((item) => {
        if (!item.product || !item.addedPrice) return false;
        const currentPrice = item.product.discountPrice ?? item.product.price;
        return currentPrice > item.addedPrice;
      })
      .map((item) => item.product!.name);
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
      const ok = this.validateAllGuestFields();
      if (!ok) {
        this.checkoutMessage =
          this.guestErrors['fullName'] ||
          this.guestErrors['phone'] ||
          this.guestErrors['email'] ||
          this.guestErrors['province'] ||
          this.guestErrors['ward'] ||
          this.guestErrors['detailAddress'] ||
          'Vui lòng kiểm tra lại thông tin giao nhận.';
        this.cdr.detectChanges();
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
          queryParams.guestOtp = result.guestActivationInfo.otp || result.guestActivationInfo.otpCode || '';
          queryParams.guestLink = result.guestActivationInfo.activationLink;
        }
        this.router.navigate(['/checkout-success'], { queryParams });
      } else {
        this.checkoutMessage = result.message || 'Thanh toán không thành công. Giỏ hàng và tồn kho được giữ nguyên.';
        this.store.showToast(this.checkoutMessage, true);
      }
    } catch (err: any) {
      this.checkoutMessage = err.message;
      this.store.showToast(this.checkoutMessage, true);
    } finally {
      this.cdr.detectChanges();
    }
  }
}
