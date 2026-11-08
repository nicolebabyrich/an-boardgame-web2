import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { StoreApiService } from '../services/store-api.service';

@Component({
  selector: 'app-admin-login-component',
  standalone: false,
  templateUrl: './admin-login-component.html',
  styleUrl: './admin-login-component.css'
})
export class AdminLoginComponent {
  email = 'admin@anstore.vn';
  password = 'password';
  showPassword = false;
  emailError = '';
  adminMessage = '';
  isSubmitting = false;

  constructor(
    public store: StoreApiService,
    private router: Router
  ) {}

  validateEmail(showWhenEmpty = false): boolean {
    const val = String(this.email || '').trim();
    if (!val && !showWhenEmpty) {
      this.emailError = '';
      return true;
    }
    const ok = this.store.isValidEmail(val);
    this.emailError = ok ? '' : 'Email không đúng định dạng. Vui lòng nhập lại.';
    return ok;
  }

  async onSubmit(): Promise<void> {
    this.adminMessage = '';
    if (!this.validateEmail(true)) return;
    this.isSubmitting = true;
    try {
      await this.store.loginAdmin(this.email, this.password);
      this.router.navigate(['/admin']);
    } catch (err: any) {
      this.adminMessage = err?.message || 'Đăng nhập thất bại.';
    } finally {
      this.isSubmitting = false;
    }
  }
}
