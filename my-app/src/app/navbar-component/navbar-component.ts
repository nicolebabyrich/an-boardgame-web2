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
      return querySection === 'offers';
    }
    return false;
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
  }

  closeMenus(): void {
    this.menuOpen = false;
    this.moreDropdownOpen = false;
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
