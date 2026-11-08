import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { StoreApiService } from '../services/store-api.service';

@Component({
  selector: 'app-register-component',
  standalone: false,
  templateUrl: './register-component.html',
  styleUrl: './register-component.css'
})
export class RegisterComponent {
  fullName = '';
  email = '';
  phone = '';
  dateOfBirth = '';
  password = '';
  confirmPassword = '';

  errors: Record<string, string> = {};
  authMessage = '';
  isSubmitting = false;
  maxBirthDate = '';

  constructor(
    public store: StoreApiService,
    private router: Router
  ) {
    this.maxBirthDate = this.store.maxBirthDateForAge(13);
  }

  get passwordsMatch(): boolean {
    return Boolean(this.password && this.confirmPassword && this.password === this.confirmPassword);
  }

  validateField(field: string, showWhenEmpty = false): boolean {
    const val = String((this as any)[field] || '');
    if (!val && !showWhenEmpty) {
      delete this.errors[field];
      return true;
    }
    let msg = '';
    if (field === 'fullName') {
      msg = this.store.isValidName(val)
        ? ''
        : 'Tên hợp lệ cần từ 2 ký tự trở lên (chấp nhận tên ngắn 2-3 ký tự hoặc tên nước ngoài, không chứa số).';
    } else if (field === 'email') {
      msg = this.store.isValidEmail(val) ? '' : 'Email chưa đúng định dạng. Ví dụ: ten@gmail.com.';
    } else if (field === 'phone') {
      msg = this.store.isValidPhone(val) ? '' : 'SĐT gồm 10 số, bắt đầu 03/05/07/08/09, không dùng số giả.';
    } else if (field === 'dateOfBirth') {
      msg = this.store.isValidDateOfBirth(val) ? '' : 'Ngày sinh chưa hợp lệ. Khách hàng cần từ 13 tuổi trở lên.';
    } else if (field === 'password') {
      msg = val.length >= 6 ? '' : 'Mật khẩu phải có ít nhất 6 ký tự.';
      if (this.confirmPassword) {
        this.validateField('confirmPassword', true);
      }
    } else if (field === 'confirmPassword') {
      if (!val) {
        msg = 'Vui lòng nhập lại mật khẩu để xác nhận.';
      } else if (val !== this.password) {
        msg = 'Mật khẩu nhập lại không khớp với mật khẩu đã tạo!';
      }
    }
    if (msg) {
      this.errors[field] = msg;
      return false;
    }
    delete this.errors[field];
    return true;
  }

  validateAll(): boolean {
    const fields = ['fullName', 'email', 'phone', 'dateOfBirth', 'password', 'confirmPassword'];
    let ok = true;
    for (const f of fields) {
      if (!this.validateField(f, f !== 'dateOfBirth')) {
        ok = false;
      }
    }
    return ok;
  }

  async onSubmit(): Promise<void> {
    this.authMessage = '';
    if (!this.validateAll()) return;
    this.isSubmitting = true;
    try {
      await this.store.registerCustomer({
        fullName: this.fullName,
        email: this.email,
        phone: this.phone,
        dateOfBirth: this.dateOfBirth,
        password: this.password,
        confirmPassword: this.confirmPassword
      });
      this.store.showToast('Đăng ký tài khoản thành công!');
      this.router.navigate(['/account']);
    } catch (err: any) {
      this.authMessage = err?.message || 'Đăng ký thất bại.';
    } finally {
      this.isSubmitting = false;
    }
  }
}
