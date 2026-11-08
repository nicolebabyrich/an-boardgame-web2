import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { StoreApiService } from '../services/store-api.service';

@Component({
  selector: 'app-forgot-password-component',
  standalone: false,
  templateUrl: './forgot-password-component.html',
  styleUrl: './forgot-password-component.css'
})
export class ForgotPasswordComponent {
  step: 'request' | 'verify' | 'complete' = 'request';
  token = '';
  demoCode = '------';
  identifier = '';
  code = '';
  password = '';
  confirmPassword = '';

  showPassword = false;
  showConfirmPassword = false;

  errors: Record<string, string> = {};
  authMessage = '';
  authSuccess = false;
  isSubmitting = false;

  constructor(
    public store: StoreApiService,
    private router: Router
  ) {}

  validateField(field: string, showWhenEmpty = false): boolean {
    const val = String((this as any)[field] || '').trim();
    if (!val && !showWhenEmpty) {
      delete this.errors[field];
      return true;
    }
    let msg = '';
    if (field === 'identifier') {
      if (val.includes('@')) {
        msg = this.store.isValidEmail(val) ? '' : 'Email chưa đúng. Ví dụ: ten@gmail.com hoặc ten@st.uel.edu.vn.';
      } else {
        msg = this.store.isValidPhone(val) ? '' : 'Nhập email hợp lệ hoặc SĐT 10 số bắt đầu 03/05/07/08/09.';
      }
    } else if (field === 'code') {
      msg = /^\d{6}$/.test(val) ? '' : 'Mã xác thực gồm 6 chữ số.';
    } else if (field === 'password' || field === 'confirmPassword') {
      msg = val.length >= 8 ? '' : 'Mật khẩu phải có ít nhất 8 ký tự.';
    }
    if (msg) {
      this.errors[field] = msg;
      return false;
    }
    delete this.errors[field];
    return true;
  }

  restartFlow(): void {
    this.step = 'request';
    this.token = '';
    this.demoCode = '------';
    this.identifier = '';
    this.code = '';
    this.password = '';
    this.confirmPassword = '';
    this.errors = {};
    this.authMessage = '';
    this.authSuccess = false;
  }

  async onSubmit(): Promise<void> {
    this.authMessage = '';
    this.authSuccess = false;
    this.isSubmitting = true;
    try {
      if (this.step === 'request') {
        if (!this.validateField('identifier', true)) return;
        const result = await this.store.requestPasswordReset(this.identifier);
        this.token = result.token;
        this.demoCode = result.code;
        this.authMessage = result.message;
        this.authSuccess = true;
        this.step = 'verify';
        return;
      }

      if (this.step === 'verify') {
        if (!this.validateField('code', true)) return;
        await this.store.verifyPasswordReset(this.token, this.code);
        this.authMessage = 'Mã hợp lệ. Vui lòng tạo mật khẩu mới.';
        this.authSuccess = true;
        this.step = 'complete';
        return;
      }

      const ok1 = this.validateField('password', true);
      const ok2 = this.validateField('confirmPassword', true);
      if (!ok1 || !ok2) return;

      const msg = await this.store.completePasswordReset({
        token: this.token,
        code: this.code,
        password: this.password,
        confirmPassword: this.confirmPassword
      });
      this.authMessage = msg;
      this.authSuccess = true;
      window.setTimeout(() => {
        this.router.navigate(['/login']);
      }, 1200);
    } catch (err: any) {
      this.authMessage = err?.message || 'Thao tác không thành công.';
      this.authSuccess = false;
    } finally {
      this.isSubmitting = false;
    }
  }
}
