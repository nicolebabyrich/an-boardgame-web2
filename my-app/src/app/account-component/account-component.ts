import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreApiService } from '../services/store-api.service';
import { AddressApiService, ProvinceOption, WardOption } from '../services/address-api.service';
import { Address } from '../classes/Address';
import { User } from '../classes/User';

@Component({
  selector: 'app-account-component',
  standalone: false,
  templateUrl: './account-component.html',
  styleUrl: './account-component.css'
})
export class AccountComponent implements OnInit {
  activeSection: 'profile' | 'addresses' | 'security' | 'rewards' = 'profile';
  maxBirthDate = '';

  // Profile form state
  profileData = {
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: ''
  };
  profileErrors: Record<string, string> = {};
  profileMessage = '';
  profileSuccess = false;

  // Password update form state (Bug #12 & #18)
  passwordData = {
    newPassword: '',
    confirmPassword: ''
  };
  passwordMessage = '';
  passwordSuccess = false;

  // Address form state
  addressFormTitle = 'Thêm địa chỉ mới';
  addressData = {
    id: '' as string | number,
    receiverName: '',
    receiverPhone: '',
    province: '',
    district: '',
    ward: '',
    labelChoice: 'Nhà riêng',
    labelCustom: '',
    detailAddress: '',
    isDefault: false
  };
  addressErrors: Record<string, string> = {};
  addressMessage = '';
  addressSuccess = false;

  provinces: ProvinceOption[] = [];
  wards: WardOption[] = [];
  loadingWards = false;

  constructor(
    public store: StoreApiService,
    private addressApi: AddressApiService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.maxBirthDate = this.store.maxBirthDateForAge(13);
  }

  async ngOnInit(): Promise<void> {
    this.syncFromCurrentUser(this.store.getCurrentUser());
    this.store.currentUser$.subscribe((user) => {
      this.syncFromCurrentUser(user);
      this.cdr.detectChanges();
    });
    this.store.addresses$.subscribe(() => {
      this.cdr.detectChanges();
    });

    if (this.router.url.includes('/addresses')) {
      this.activeSection = 'addresses';
    } else {
      this.route.queryParamMap.subscribe((params) => {
        const tab = params.get('tab');
        if (tab === 'addresses') this.activeSection = 'addresses';
        else if (tab === 'security') this.activeSection = 'security';
        else if (tab === 'rewards') this.activeSection = 'rewards';
        else this.activeSection = 'profile';
        this.cdr.detectChanges();
      });
    }

    this.provinces = await this.addressApi.getProvinces();
    this.cdr.detectChanges();
  }

  private syncFromCurrentUser(user: User | null): void {
    if (!user) return;
    this.profileData = {
      fullName: user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
      dateOfBirth: user.dateOfBirth || ''
    };
    if (!this.addressData.id && !this.addressData.receiverName) {
      this.addressData.receiverName = user.fullName || '';
      this.addressData.receiverPhone = user.phone || '';
    }
  }

  get user(): User | null {
    return this.store.getCurrentUser();
  }

  get addresses(): Address[] {
    return this.store.getUserAddresses();
  }

  formatAddressLine(address: Address): string {
    return [address.detailAddress, address.ward, address.district, address.province]
      .filter(Boolean)
      .join(', ');
  }

  switchPage(target: 'profile' | 'addresses' | 'security' | 'rewards'): void {
    this.activeSection = target;
    if (target === 'addresses') {
      this.router.navigate(['/addresses']);
    } else {
      this.router.navigate(['/account'], {
        queryParams: target === 'profile' ? {} : { tab: target }
      });
    }
    this.cdr.detectChanges();
  }

  get memberSummary() {
    const userOrders = this.store.orders$.value.filter((o) => o.status !== 'CANCELLED');
    const totalSpent = userOrders.reduce((s, o) => s + Number(o.total || 0), 0);
    const ngocAnPoints = Math.max(120, Math.floor(totalSpent / 10000));
    const rankName =
      totalSpent >= 1500000
        ? 'Đại Lý Tự Khanh (VIP Vàng)'
        : totalSpent >= 500000
          ? 'Ngự Sử Đài (Thành viên Bạc)'
          : 'Thám Tử Tập Sự';
    const nextThreshold = totalSpent >= 1500000 ? 3000000 : 1500000;
    const progressPercent = Math.min(100, Math.round((totalSpent / nextThreshold) * 100));
    return {
      totalOrders: userOrders.length,
      totalSpent,
      ngocAnPoints,
      rankName,
      progressPercent
    };
  }

  get myAdvisorTickets() {
    const u = this.user;
    return (this.store.advisorTickets$.value || []).filter(
      (t) => !u || t.customerPhone === u.phone || t.customerName === u.fullName
    );
  }

  copyRewardCode(code: string): void {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    this.store.showToast(`Đã sao chép mã đặc quyền ${code}!`);
  }

  logout(): void {
    this.store.logoutCustomer();
    this.store.showToast('Đã đăng xuất khỏi tài khoản.');
    this.cdr.detectChanges();
    this.router.navigate(['/home']);
  }

  // ==================== PROFILE VALIDATION & SUBMIT ====================
  validateProfileField(field: string, showWhenEmpty = false): boolean {
    const val = String((this.profileData as any)[field] || '');
    if (!val && !showWhenEmpty) {
      delete this.profileErrors[field];
      return true;
    }
    let msg = '';
    if (field === 'fullName') {
      msg = this.store.isValidName(val) ? '' : 'Tên hợp lệ cần từ 2 ký tự trở lên (chấp nhận tên ngắn hoặc tên nước ngoài).';
    } else if (field === 'email') {
      msg = this.store.isValidEmail(val) ? '' : 'Email chưa đúng. Ví dụ: ten@gmail.com.';
    } else if (field === 'phone') {
      msg = this.store.isValidPhone(val) ? '' : 'SĐT gồm 10 số, bắt đầu 03/05/07/08/09, không dùng số giả.';
    } else if (field === 'dateOfBirth') {
      msg = this.store.isValidDateOfBirth(val) ? '' : 'Ngày sinh chưa hợp lệ. Khách hàng cần từ 13 tuổi trở lên.';
    }
    if (msg) {
      this.profileErrors[field] = msg;
      return false;
    }
    delete this.profileErrors[field];
    return true;
  }

  async onSubmitProfile(): Promise<void> {
    this.profileMessage = '';
    this.profileSuccess = false;
    const fields = ['fullName', 'email', 'phone', 'dateOfBirth'];
    let ok = true;
    for (const f of fields) {
      if (!this.validateProfileField(f, f !== 'dateOfBirth')) ok = false;
    }
    if (!ok) return;

    try {
      await this.store.updateProfile(this.profileData);
      this.profileMessage = 'Đã lưu cập nhật hồ sơ thành công.';
      this.profileSuccess = true;
      this.store.showToast('Đã lưu cập nhật hồ sơ cá nhân thành công!', false);
    } catch (err: any) {
      this.profileMessage = err?.message || 'Cập nhật thất bại.';
      this.profileSuccess = false;
    }
  }

  async onSubmitPassword(): Promise<void> {
    this.passwordMessage = '';
    this.passwordSuccess = false;
    const p1 = this.passwordData.newPassword.trim();
    const p2 = this.passwordData.confirmPassword.trim();
    if (p1.length < 6) {
      this.passwordMessage = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
      return;
    }
    if (p1 !== p2) {
      this.passwordMessage = 'Mật khẩu nhập lại không khớp với mật khẩu mới!';
      return;
    }
    try {
      await this.store.updateProfile({
        ...this.profileData,
        newPassword: p1
      });
      this.passwordData = { newPassword: '', confirmPassword: '' };
      this.passwordMessage = 'Đã cập nhật mật khẩu mới thành công!';
      this.passwordSuccess = true;
      this.store.showToast('Đã cập nhật mật khẩu mới thành công!', false);
    } catch (err: any) {
      this.passwordMessage = err?.message || 'Không thể đổi mật khẩu.';
      this.passwordSuccess = false;
    }
  }

  // ==================== ADDRESS VALIDATION & ACTIONS ====================
  async onProvinceChange(selectedWard = ''): Promise<void> {
    this.validateAddressField('province', true);
    const matched = this.provinces.find((p) => p.name === this.addressData.province);
    if (!matched) {
      this.wards = [];
      this.addressData.ward = '';
      return;
    }
    this.loadingWards = true;
    this.wards = await this.addressApi.getWards(matched.code);
    this.loadingWards = false;
    this.addressData.ward = selectedWard || '';
  }

  validateAddressField(field: string, showWhenEmpty = false): boolean {
    const val = String((this.addressData as any)[field] || '');
    if (!val && !showWhenEmpty) {
      delete this.addressErrors[field];
      return true;
    }
    let msg = '';
    if (field === 'receiverName') {
      msg = this.store.isValidName(val) ? '' : 'Tên người nhận cần từ 2 ký tự trở lên, không chứa số.';
    } else if (field === 'receiverPhone') {
      msg = this.store.isValidPhone(val) ? '' : 'SĐT gồm 10 số, bắt đầu 03/05/07/08/09, không dùng số giả.';
    } else if (field === 'province') {
      msg = val ? '' : 'Vui lòng chọn tỉnh/thành phố.';
    } else if (field === 'ward') {
      msg = val ? '' : 'Vui lòng chọn phường/xã.';
    } else if (field === 'detailAddress') {
      msg = val.trim().length >= 5 ? '' : 'Địa chỉ chi tiết phải có ít nhất 5 ký tự.';
    } else if (field === 'labelCustom') {
      if (this.addressData.labelChoice === 'OTHER') {
        msg = val.trim().length >= 2 ? '' : 'Vui lòng nhập nhãn địa chỉ.';
      }
    }
    if (msg) {
      this.addressErrors[field] = msg;
      return false;
    }
    delete this.addressErrors[field];
    return true;
  }

  resetAddressForm(): void {
    const user = this.user;
    this.addressFormTitle = 'Thêm địa chỉ mới';
    this.addressData = {
      id: '',
      receiverName: user?.fullName || '',
      receiverPhone: user?.phone || '',
      province: '',
      district: '',
      ward: '',
      labelChoice: 'Nhà riêng',
      labelCustom: '',
      detailAddress: '',
      isDefault: false
    };
    this.wards = [];
    this.addressErrors = {};
    this.addressMessage = '';
    this.addressSuccess = false;
  }

  async editAddress(address: Address): Promise<void> {
    const standardLabels = ['Nhà riêng', 'Công ty', 'Trường học'];
    const isStandard = standardLabels.includes(address.label);
    this.addressFormTitle = 'Sửa địa chỉ';
    this.addressData = {
      id: address.id,
      receiverName: address.receiverName || '',
      receiverPhone: address.receiverPhone || '',
      province: address.province || '',
      district: address.district || '',
      ward: address.ward || '',
      labelChoice: isStandard ? address.label : 'OTHER',
      labelCustom: isStandard ? '' : address.label,
      detailAddress: address.detailAddress || '',
      isDefault: Boolean(address.isDefault)
    };
    await this.onProvinceChange(address.ward);
    this.addressErrors = {};
    document.getElementById('address-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async setDefaultAddress(addressId: number): Promise<void> {
    try {
      await this.store.setDefaultAddress(addressId);
    } catch (err: any) {
      this.addressMessage = err?.message || 'Không thể đặt địa chỉ mặc định.';
      this.addressSuccess = false;
    }
  }

  async deleteAddress(addressId: number): Promise<void> {
    try {
      await this.store.deleteAddress(addressId);
    } catch (err: any) {
      this.addressMessage = err?.message || 'Không thể xóa địa chỉ.';
      this.addressSuccess = false;
    }
  }

  async onSubmitAddress(): Promise<void> {
    this.addressMessage = '';
    this.addressSuccess = false;
    const fields = ['receiverName', 'receiverPhone', 'province', 'ward', 'detailAddress'];
    let ok = true;
    for (const f of fields) {
      if (!this.validateAddressField(f, true)) ok = false;
    }
    if (this.addressData.labelChoice === 'OTHER' && !this.validateAddressField('labelCustom', true)) {
      ok = false;
    }
    if (!ok) return;

    const label = this.addressData.labelChoice === 'OTHER'
      ? this.addressData.labelCustom.trim()
      : this.addressData.labelChoice;

    try {
      await this.store.saveAddress({
        id: this.addressData.id || undefined,
        receiverName: this.addressData.receiverName,
        receiverPhone: this.addressData.receiverPhone,
        province: this.addressData.province,
        district: this.addressData.district,
        ward: this.addressData.ward,
        label,
        detailAddress: this.addressData.detailAddress,
        isDefault: this.addressData.isDefault
      });
      this.resetAddressForm();
      this.addressMessage = 'Đã lưu địa chỉ giao hàng thành công.';
      this.addressSuccess = true;
      this.store.showToast('Đã lưu địa chỉ giao hàng thành công!', false);
    } catch (err: any) {
      this.addressMessage = err?.message || 'Không thể lưu địa chỉ.';
      this.addressSuccess = false;
    }
  }
}
