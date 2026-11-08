import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreApiService } from '../services/store-api.service';

@Component({
  selector: 'app-login-component',
  standalone: false,
  templateUrl: './login-component.html',
  styleUrl: './login-component.css'
})
export class LoginComponent implements OnInit, OnDestroy {
  loginMode: 'password' | 'qr' | 'otp' = 'password';
  identifier = 'oanhntkk24411@st.uel.edu.vn';
  password = '0704477397';
  showPassword = false;
  identifierError = '';
  passwordError = '';
  authMessage = '';
  isSubmitting = false;

  // Dynamic Auto-Generated QR Login state (Bug #6)
  qrSessionCode = '';
  qrCountdown = 60;
  qrMatrix: boolean[][] = [];
  qrApiError = false;
  private qrInterval: any = null;

  // Guest OTP Activation state (Right #1)
  otpIdentifier = '';
  otpCode = '';
  otpNewPassword = '';
  otpMessage = '';
  otpSuccess = false;

  constructor(
    public store: StoreApiService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.generateNewQrSession();
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const mode = params.get('mode');
      const email = params.get('email');
      const otp = params.get('otp');
      const qrToken = params.get('qrToken');

      if (qrToken) {
        this.loginMode = 'qr';
        this.qrSessionCode = qrToken;
        this.simulateQrLogin();
        return;
      }

      if (mode === 'activate' || otp) {
        this.loginMode = 'otp';
        if (email) this.otpIdentifier = email;
        if (otp) this.otpCode = otp;
      } else if (mode === 'qr') {
        this.setLoginMode('qr');
      }
    });

    this.qrInterval = setInterval(() => {
      if (this.loginMode === 'qr') {
        if (this.qrCountdown > 1) {
          this.qrCountdown--;
        } else {
          this.generateNewQrSession();
        }
        this.cdr.detectChanges();
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.qrInterval) {
      clearInterval(this.qrInterval);
    }
  }

  setLoginMode(mode: 'password' | 'qr' | 'otp'): void {
    this.loginMode = mode;
    if (mode === 'qr') {
      this.generateNewQrSession();
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Tự động sinh mã phiên QR mới + Ma trận QR 25x25 động (thay đổi hình dạng thực tế mỗi lần tạo)
   * đồng thời tạo URL QR chuẩn quốc tế có thể quét thật bằng điện thoại.
   */
  generateNewQrSession(): void {
    const randomPart = Math.floor(100000 + Math.random() * 900000);
    const timeSuffix = String(Date.now()).slice(-4);
    this.qrSessionCode = `AN-QR-${randomPart}-${timeSuffix}`;
    this.qrCountdown = 60;
    this.qrMatrix = this.buildQrMatrixFromSeed(this.qrSessionCode, 25);
  }

  get qrPayloadUrl(): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200';
    return `${origin}/login?qrToken=${encodeURIComponent(this.qrSessionCode)}`;
  }

  get dynamicQrImageUrl(): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=210x210&margin=4&color=240d0b&bgcolor=fff9eb&data=${encodeURIComponent(this.qrPayloadUrl)}`;
  }

  refreshQrCode(): void {
    this.generateNewQrSession();
    this.store.showToast(`Đã tự động sinh mã QR mới: ${this.qrSessionCode}`);
  }

  private buildQrMatrixFromSeed(seedText: string, size = 25): boolean[][] {
    const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
    const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

    // Vẽ 3 cụm Finder Pattern 7x7 chuẩn QR ở 3 góc
    const drawFinder = (r0: number, c0: number) => {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const rr = r0 + r;
          const cc = c0 + c;
          if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
          reserved[rr][cc] = true;
          const inOuter = r >= 0 && r <= 6 && c >= 0 && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6);
          const inInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          matrix[rr][cc] = inOuter || inInner;
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    // Timing pattern hàng 6 & cột 6
    for (let i = 8; i < size - 8; i++) {
      reserved[6][i] = true;
      reserved[i][6] = true;
      matrix[6][i] = i % 2 === 0;
      matrix[i][6] = i % 2 === 0;
    }

    // Chừa vùng trung tâm cho con dấu "ẨN"
    const center = Math.floor(size / 2);
    for (let r = center - 2; r <= center + 2; r++) {
      for (let c = center - 2; c <= center + 2; c++) {
        reserved[r][c] = true;
        matrix[r][c] = false;
      }
    }

    // Sinh bit dữ liệu giả ngẫu nhiên từ chuỗi seedText
    let hash = 2166136261;
    for (let i = 0; i < seedText.length; i++) {
      hash ^= seedText.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (reserved[r][c]) continue;
        hash ^= (r * 31 + c * 17) & 0xff;
        hash = Math.imul(hash, 16777619);
        matrix[r][c] = ((hash >>> 0) % 100) < 48;
      }
    }

    return matrix;
  }

  async simulateQrLogin(): Promise<void> {
    this.isSubmitting = true;
    try {
      await this.store.loginCustomer('oanhntkk24411@st.uel.edu.vn', '0704477397');
      this.store.showToast(`Đăng nhập bằng mã QR (${this.qrSessionCode}) thành công!`);
      const redirect = this.route.snapshot.queryParamMap.get('redirect');
      this.router.navigateByUrl(redirect || '/account');
    } catch (err: any) {
      this.authMessage = err?.message || 'Không thể đăng nhập bằng QR.';
    } finally {
      this.isSubmitting = false;
    }
  }

  validateIdentifier(showWhenEmpty = false): boolean {
    const text = String(this.identifier || '').trim();
    if (!text) {
      if (showWhenEmpty) {
        this.identifierError = 'Bắt buộc: Nhập email hợp lệ hoặc SĐT 10 số bắt đầu 03/05/07/08/09.';
        return false;
      }
      this.identifierError = '';
      return true;
    }
    if (text.includes('@')) {
      const ok = this.store.isValidEmail(text);
      this.identifierError = ok ? '' : 'Email chưa đúng định dạng. Ví dụ: ten@gmail.com.';
      return ok;
    }
    const ok = this.store.isValidPhone(text);
    this.identifierError = ok ? '' : 'Nhập email hợp lệ hoặc SĐT 10 số bắt đầu 03/05/07/08/09.';
    return ok;
  }

  async onSubmit(): Promise<void> {
    this.authMessage = '';
    this.passwordError = '';
    if (!this.validateIdentifier(true)) return;
    if (!this.password.trim()) {
      this.passwordError = 'Vui lòng nhập mật khẩu đăng nhập.';
      return;
    }
    this.isSubmitting = true;
    try {
      await this.store.loginCustomer(this.identifier, this.password);
      const redirect = this.route.snapshot.queryParamMap.get('redirect');
      this.router.navigateByUrl(redirect || '/account');
    } catch (err: any) {
      this.authMessage = err?.message || 'Đăng nhập thất bại.';
    } finally {
      this.isSubmitting = false;
    }
  }

  async onActivateOtp(): Promise<void> {
    this.otpMessage = '';
    this.otpSuccess = false;
    if (!this.otpIdentifier.trim() || !this.otpCode.trim()) {
      this.otpMessage = 'Vui lòng nhập Email/SĐT và mã OTP 6 số.';
      return;
    }
    this.isSubmitting = true;
    try {
      const res = await this.store.activateGuestAccount({
        identifier: this.otpIdentifier.trim(),
        otp: this.otpCode.trim(),
        newPassword: this.otpNewPassword.trim() || undefined
      });
      this.otpMessage = res.message;
      this.otpSuccess = true;
      setTimeout(() => this.router.navigate(['/account']), 900);
    } catch (err: any) {
      this.otpMessage = err.message;
      this.otpSuccess = false;
    } finally {
      this.isSubmitting = false;
    }
  }
}
