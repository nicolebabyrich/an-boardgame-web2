import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { StoreApiService } from '../services/store-api.service';
import { User } from '../classes/User';

@Component({
  selector: 'app-navbar-component',
  standalone: false,
  templateUrl: './navbar-component.html',
  styleUrl: './navbar-component.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  menuOpen = false;
  moreDropdownOpen = false;
  notifDropdownOpen = false;
  currentUser: User | null = null;
  cartCount = 0;
  private subs = new Subscription();

  readonly storyPillLinks = [
    { key: 'story', path: '/home', section: 'story', label: 'Cốt truyện' },
    { key: 'simulation', path: '/simulation', section: 'simulation', label: 'Phòng án mô phỏng' },
    { key: 'characters', path: '/characters', section: 'characters', label: 'Hồ sơ nhân chứng' },
    { key: 'guide', path: '/guide', section: 'guide', label: 'Cách chơi' }
  ];

  constructor(
    public store: StoreApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.currentUser = this.store.getCurrentUser();
    this.cartCount = this.store.getCartCount();
  }

  ngOnInit(): void {
    this.subs.add(
      this.store.currentUser$.subscribe((user) => {
        this.currentUser = user;
        this.cdr.detectChanges();
      })
    );
    this.subs.add(
      this.store.cartItems$.subscribe(() => {
        this.cartCount = this.store.getCartCount();
        this.cdr.detectChanges();
      })
    );
    this.subs.add(
      this.router.events.subscribe((ev) => {
        if (ev instanceof NavigationEnd) {
          this.menuOpen = false;
          this.moreDropdownOpen = false;
          this.currentUser = this.store.getCurrentUser();
          this.cartCount = this.store.getCartCount();
          this.cdr.detectChanges();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  isStorySectionActive(sectionKey: string): boolean {
    const [rawPath, queryStr] = this.router.url.split('?');
    const path = rawPath.replace(/^\//, '');
    const params = new URLSearchParams(queryStr || '');
    const querySection = params.get('section');

    if (sectionKey === 'story') {
      return (path === '' || path === 'home' || path === 'story') && (!querySection || querySection === 'story');
    }
    if (sectionKey === 'simulation') {
      return path === 'simulation' || querySection === 'simulation';
    }
    if (sectionKey === 'characters') {
      return path === 'characters' || querySection === 'characters';
    }
    if (sectionKey === 'guide') {
      return path === 'guide' || querySection === 'guide';
    }
    if (sectionKey === 'offers') {
      return path === 'offers' || querySection === 'offers';
    }
    return false;
  }

  get orderNotifications(): Array<{
    orderId: number;
    code: string;
    title: string;
    desc: string;
    at: string;
    badgeColor: string;
  }> {
    const user = this.currentUser;
    const allOrders = this.store.orders$.value || [];
    const myOrders = user
      ? allOrders.filter((o) => o.userId === user.id)
      : allOrders.filter((o) => this.store.isGuestOrderAuthorized(o.id));

    const returns = this.store.returnRequests$.value || [];
    const list: Array<{
      orderId: number;
      code: string;
      title: string;
      desc: string;
      at: string;
      badgeColor: string;
    }> = [];

    for (const ord of myOrders.slice(0, 6)) {
      const ret = returns.find((r) => r.orderId === ord.id);
      if (ret) {
        list.push({
          orderId: ord.id,
          code: ord.code,
          title: `Đổi/Trả ${ret.code}: ${this.store.returnStatusLabel(ret.status)}`,
          desc: ret.adminNote || `Yêu cầu đổi/trả cho đơn ${ord.code} đang ở trạng thái ${this.store.returnStatusLabel(ret.status)}.`,
          at: ret.createdAt || ord.createdAt,
          badgeColor: ret.status === 'APPROVED' ? '#22c55e' : (ret.status === 'REJECTED' ? '#ef4444' : '#f59e0b')
        });
      }
      const lastTimeline = ord.timeline?.[ord.timeline.length - 1];
      list.push({
        orderId: ord.id,
        code: ord.code,
        title: `Đơn ${ord.code}: ${this.store.orderStatusLabel(ord.status)}`,
        desc: `Thanh toán: ${this.store.paymentStatusLabel(ord.paymentStatus)} · Tổng: ${this.store.formatCurrency(ord.total)}`,
        at: lastTimeline?.at || ord.createdAt,
        badgeColor: ord.status === 'DELIVERED' ? '#22c55e' : (ord.status === 'CANCELLED' ? '#ef4444' : '#d5b76b')
      });
    }
    return list.slice(0, 6);
  }

  isRouteActive(prefix: string): boolean {
    const basePath = this.router.url.split('?')[0];
    return basePath.startsWith(prefix);
  }

  isMoreActive(): boolean {
    return (
      this.isStorySectionActive('offers') ||
      this.isRouteActive('/blog') ||
      this.isRouteActive('/orders')
    );
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  toggleMoreDropdown(): void {
    this.moreDropdownOpen = !this.moreDropdownOpen;
    this.notifDropdownOpen = false;
  }

  toggleNotifDropdown(): void {
    this.notifDropdownOpen = !this.notifDropdownOpen;
    this.moreDropdownOpen = false;
  }

  closeMenus(): void {
    this.menuOpen = false;
    this.moreDropdownOpen = false;
    this.notifDropdownOpen = false;
  }

  logout(): void {
    this.store.logoutCustomer();
    this.currentUser = null;
    this.cdr.detectChanges();
    this.store.showToast('Đã đăng xuất khỏi tài khoản.');
    this.router.navigate(['/home']);
  }

  historyBack(): void {
    window.history.back();
  }

  historyForward(): void {
    window.history.forward();
  }
}
