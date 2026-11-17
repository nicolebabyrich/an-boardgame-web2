import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreApiService } from '../services/store-api.service';

@Component({
  selector: 'app-checkout-success-component',
  standalone: false,
  templateUrl: './checkout-success-component.html',
  styleUrl: './checkout-success-component.css'
})
export class CheckoutSuccessComponent implements OnInit {
  code = '';
  orderId = 0;
  isCod = false;

  guestEmail = '';
  guestOtp = '';
  guestLink = '';
  otpInput = '';
  newPasswordInput = '';
  activationMessage = '';
  activationSuccess = false;

  constructor(
    public store: StoreApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.code = params.get('code') || '';
      this.orderId = Number(params.get('orderId') || 0);
      this.isCod = params.get('method') === 'COD';
      this.guestEmail = params.get('guestEmail') || '';
      this.guestOtp = params.get('guestOtp') || '';
      this.guestLink = params.get('guestLink') || '';
      if (this.guestOtp) {
        this.otpInput = this.guestOtp;
      }
    });

    if (!this.orderId && this.code) {
      const found = this.store.orders$.value.find((o) => o.code === this.code);
      if (found) this.orderId = found.id;
    }
  }

  get targetOrderId(): number {
    if (this.orderId) return this.orderId;
    const found = this.store.orders$.value.find((o) => o.code === this.code);
    return found ? found.id : 1;
  }

  async activateGuestAccount(): Promise<void> {
    this.activationMessage = '';
    this.activationSuccess = false;
    try {
      const res = await this.store.activateGuestAccount({
        identifier: this.guestEmail,
        otp: this.otpInput.trim(),
        newPassword: this.newPasswordInput.trim() || undefined
      });
      this.activationMessage = res.message;
      this.activationSuccess = true;
      this.store.showToast('Đã kích hoạt tài khoản thành công!');
    } catch (err: any) {
      this.activationMessage = err.message;
      this.activationSuccess = false;
    }
  }
}
