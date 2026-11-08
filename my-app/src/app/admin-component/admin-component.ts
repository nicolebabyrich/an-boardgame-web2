import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreApiService } from '../services/store-api.service';
import { Product } from '../classes/Product';
import { Category } from '../classes/Category';
import { Order } from '../classes/Order';
import { Voucher } from '../classes/Voucher';
import { ReturnRequest, InventoryTransaction } from '../classes/ReturnRequest';
import { Review } from '../classes/Review';
import { BlogPost } from '../classes/BlogPost';

@Component({
  selector: 'app-admin-component',
  standalone: false,
  templateUrl: './admin-component.html',
  styleUrl: './admin-component.css'
})
export class AdminComponent implements OnInit {
  readonly Math = Math;
  readonly adminTabs: [string, string][] = [
    ['dashboard', 'Dashboard'],
    ['products', 'Sản phẩm'],
    ['categories', 'Danh mục'],
    ['inventory', 'Tồn kho'],
    ['orders', 'Đơn hàng'],
    ['vouchers', 'Voucher'],
    ['returns', 'Đổi/ Trả'],
    ['reviews', 'Đánh giá'],
    ['blogs', 'Blog'],
    ['advisor', 'Tư vấn viên']
  ];

  activeTab = 'dashboard';
  selectedOrderId: number | null = null;
  categoryFilter = 'all';
  starFilter = 'all';

  adminMessage = '';
  adminSuccess = false;

  // Bulk select products
  selectedProductIds = new Set<number>();

  // Forms state
  productForm = {
    id: '' as string | number,
    name: '',
    category: 'boardgame',
    image: '/img/products/18.png',
    price: null as number | null,
    discountPrice: null as number | null,
    stock: null as number | null,
    historicalPeriod: '',
    description: ''
  };

  categoryForm = {
    name: '',
    description: ''
  };

  voucherForm = {
    code: '',
    name: '',
    type: 'percentage',
    value: null as number | null,
    maxDiscount: null as number | null,
    minOrder: 0,
    startAt: '',
    endAt: '',
    usageLimit: 100
  };

  blogForm = {
    title: '',
    excerpt: ''
  };

  // Per-row state for orders, returns, user blogs, inventory, and blog preview
  orderStatusMap: Record<number, string> = {};
  returnNotes: Record<number, string> = {};
  userBlogNotes: Record<number, string> = {};
  inventorySearch = '';
  inventoryFilter: 'ALL' | 'LOW' | 'OUT' | 'FEFO' | 'OK' = 'ALL';
  inventoryZoneFilter: 'ALL' | 'ZONE_A' | 'ZONE_B' | 'ZONE_C' = 'ALL';
  inventorySubTab: 'overview' | 'receipt' | 'audit' | 'ledger' = 'overview';
  ledgerTypeFilter = 'ALL';
  ledgerSearch = '';
  lastRealtimeSyncAt = new Date().toLocaleTimeString('vi-VN');

  // WMS Phiếu Nhập / Xuất / Điều chỉnh kho chuyên nghiệp
  wmsReceiptForm = {
    type: 'IMPORT' as 'IMPORT' | 'EXPORT' | 'ADJUSTMENT',
    productId: 1,
    quantity: 10,
    batchCode: 'LOT-2026-Q4-01',
    importDate: new Date().toISOString().slice(0, 10),
    expiryDate: '2027-12-31',
    warehouseLocation: 'Khu A · Dãy 01 · Kệ A1-T2',
    minStock: 6,
    performer: 'Quản kho ẨN Store',
    reason: 'Nhập lô hàng mới từ xưởng in'
  };

  // WMS Kiểm kê thực tế (Stocktake Audit) & Định mức tối thiểu
  auditActualCountMap: Record<number, number> = {};
  auditNoteMap: Record<number, string> = {};
  minStockEditMap: Record<number, number> = {};
  locationEditMap: Record<number, string> = {};
  batchEditMap: Record<number, string> = {};
  expiryEditMap: Record<number, string> = {};

  inventoryCustomQty: Record<number, number> = {};
  inventoryCustomReason: Record<number, string> = {};
  previewBlogPost: BlogPost | null = null;

  // Tab Tư vấn viên & Phân tích cảm xúc khách hàng (Xanh / Cam / Đỏ)
  advisorEmotionFilter: 'ALL' | 'RED' | 'ORANGE' | 'GREEN' = 'ALL';
  advisorReplyMap: Record<number, string> = {};

  constructor(
    public store: StoreApiService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.store.isAdminLoggedIn()) {
      this.router.navigate(['/admin-login']);
      return;
    }

    this.route.queryParamMap.subscribe((params) => {
      const nextTab = params.get('tab') || 'dashboard';
      const nextCat = params.get('category') || 'all';
      this.activeTab = nextTab;
      const ordId = params.get('orderId');
      this.selectedOrderId = ordId ? Number(ordId) : null;
      this.categoryFilter = nextCat;
      this.starFilter = params.get('rating') || 'all';
      this.adminMessage = '';
      if (nextTab === 'products' && nextCat !== 'all') {
        setTimeout(() => {
          document.getElementById('admin-product-list-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      }
    });

    this.store.orders$.subscribe((orders) => {
      orders.forEach((o) => {
        this.orderStatusMap[o.id] = o.status;
      });
    });

    this.store.returnRequests$.subscribe((returns) => {
      returns.forEach((r) => {
        if (this.returnNotes[r.id] === undefined) {
          this.returnNotes[r.id] = r.adminNote || '';
        }
      });
    });

    this.store.userBlogSubmissions$.subscribe((posts) => {
      (posts || []).forEach((p) => {
        if (this.userBlogNotes[p.id] === undefined) {
          this.userBlogNotes[p.id] = p.adminNote || '';
        }
      });
    });

    this.store.products$.subscribe((prods) => {
      this.lastRealtimeSyncAt = new Date().toLocaleTimeString('vi-VN');
      prods.forEach((p) => {
        if (this.auditActualCountMap[p.id] === undefined) {
          this.auditActualCountMap[p.id] = p.stock;
        }
        if (this.minStockEditMap[p.id] === undefined) {
          this.minStockEditMap[p.id] = this.getMinStock(p);
        }
        if (this.locationEditMap[p.id] === undefined) {
          this.locationEditMap[p.id] = this.getWarehouseLocation(p);
        }
        if (this.batchEditMap[p.id] === undefined) {
          this.batchEditMap[p.id] = this.getBatchCode(p);
        }
        if (this.expiryEditMap[p.id] === undefined) {
          this.expiryEditMap[p.id] = this.getExpiryDate(p);
        }
      });
    });
  }

  get activeTabLabel(): string {
    return this.adminTabs.find(([id]) => id === this.activeTab)?.[1] || 'Dashboard';
  }

  switchTab(tab: string, extraParams: Record<string, any> = {}): void {
    this.router.navigate(['/admin'], { queryParams: { tab, ...extraParams } });
  }

  logoutAdmin(): void {
    this.store.logoutAdmin();
    this.router.navigate(['/admin-login']);
  }

  showMsg(msg: string, success = false): void {
    this.adminMessage = msg;
    this.adminSuccess = success;
    if (msg) {
      this.store.showToast(msg, !success);
    }
  }

  // ==================== DATA GETTERS ====================
  get products(): Product[] {
    return this.store.products$.value;
  }

  get realCategories(): Category[] {
    return this.store.categories$.value.filter((c) => c.id !== 'all');
  }

  get orders(): Order[] {
    return this.store.orders$.value;
  }

  get vouchers(): Voucher[] {
    return this.store.vouchers$.value;
  }

  get returns(): ReturnRequest[] {
    return this.store.returnRequests$.value;
  }

  get reviews(): Review[] {
    return this.store.reviews$.value;
  }

  get blogs(): BlogPost[] {
    return this.store.blogs$.value;
  }

  get userBlogSubmissions(): any[] {
    return this.store.userBlogSubmissions$.value || [];
  }

  get transactions(): InventoryTransaction[] {
    return this.store.inventoryTransactions$.value;
  }

  // ==================== DASHBOARD METRICS ====================
  get dashboardStats() {
    const orders = this.orders;
    const products = this.products;
    const categories = this.realCategories;
    const paidOrders = orders.filter((o) => o.paymentStatus === 'SUCCESS' || o.status === 'DELIVERED');
    const revenue = paidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const totalOrders = orders.length;
    const averageOrder = paidOrders.length ? Math.round(revenue / paidOrders.length) : 0;
    const completedOrders = orders.filter((o) => o.status === 'DELIVERED').length;
    const completionRate = totalOrders ? Math.round((completedOrders / totalOrders) * 100) : 0;
    const lowStock = products.filter((p) => Number(p.stock || 0) <= 5).length;
    const pendingOrders = orders.filter((o) => o.status === 'PENDING').length;
    const pendingBlogs = this.userBlogSubmissions.filter((p) => p.status === 'PENDING').length;
    const pendingReturns = this.returns.filter((r) => r.status === 'PENDING').length;
    const totalReviews = this.reviews.length;
    const visibleReviews = this.reviews.filter((r) => r.status === 'VISIBLE').length;
    const averageRating = totalReviews
      ? (this.reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / totalReviews).toFixed(1)
      : '0.0';

    const statusConfig: [string, string, string][] = [
      ['PENDING', 'Chờ xác nhận', '#e2b05b'],
      ['CONFIRMED', 'Đã xác nhận', '#c68a46'],
      ['SHIPPING', 'Đang giao', '#d95836'],
      ['DELIVERED', 'Đã giao', '#89b96f'],
      ['CANCELLED', 'Đã hủy', '#9b4b49']
    ];
    const statusCounts = statusConfig.map(([status, label, color]) => ({
      status,
      label,
      color,
      count: orders.filter((o) => o.status === status).length
    }));

    let donutCursor = 0;
    const donutGradient = statusCounts
      .filter((item) => item.count > 0)
      .map((item) => {
        const start = donutCursor;
        const size = totalOrders ? (item.count / totalOrders) * 100 : 0;
        donutCursor += size;
        return `${item.color} ${start}% ${donutCursor}%`;
      })
      .join(', ') || 'rgba(255,244,218,0.16) 0% 100%';

    const parseOrderDate = (value: string) => {
      const match = String(value || '').match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
      if (!match) return new Date();
      return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    };
    const trendMap = new Map<string, { label: string; orders: number; revenue: number; time: number }>();
    orders.forEach((order) => {
      const date = parseOrderDate(order.createdAt);
      const key = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
      const current = trendMap.get(key) || { label: key, orders: 0, revenue: 0, time: date.getTime() };
      current.orders += 1;
      current.revenue += Number(order.total || 0);
      trendMap.set(key, current);
    });
    const trendRows = [...trendMap.values()].sort((a, b) => a.time - b.time).slice(-6);
    const maxTrendOrders = Math.max(1, ...trendRows.map((r) => r.orders));
    const maxTrendRevenue = Math.max(1, ...trendRows.map((r) => r.revenue));

    const productRows = products
      .map((product) => {
        const orderItems = orders.flatMap((o) => o.items || []).filter((i) => i.productId === product.id);
        const sold = orderItems.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
        const sales = orderItems.reduce((sum, i) => sum + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0);
        return { product, sold, sales };
      })
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);
    const maxSold = Math.max(1, ...productRows.map((r) => r.sold));

    const categoryRows = categories.map((category) => {
      const catProductIds = new Set(products.filter((p) => p.category === category.id).map((p) => p.id));
      const sales = orders
        .flatMap((o) => o.items || [])
        .filter((i) => catProductIds.has(i.productId))
        .reduce((sum, i) => sum + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0);
      return { category, sales };
    });
    const maxCategorySales = Math.max(1, ...categoryRows.map((r) => r.sales));

    return {
      revenue,
      totalOrders,
      averageOrder,
      completedOrders,
      completionRate,
      lowStock,
      pendingOrders,
      pendingBlogs,
      pendingReturns,
      totalReviews,
      visibleReviews,
      averageRating,
      statusCounts,
      donutGradient,
      trendRows,
      maxTrendOrders,
      maxTrendRevenue,
      productRows,
      maxSold,
      categoryRows,
      maxCategorySales
    };
  }

  // ==================== PRODUCTS TAB ====================
  get filteredProducts(): Product[] {
    if (this.categoryFilter === 'all') return this.products;
    return this.products.filter((p) => p.category === this.categoryFilter);
  }

  onProductCategoryFilterChange(val: string): void {
    this.categoryFilter = val;
    this.selectedProductIds.clear();
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      const url = val === 'all' ? '/admin?tab=products' : `/admin?tab=products&category=${encodeURIComponent(val)}`;
      window.history.replaceState({}, '', url);
    }
    this.cdr.detectChanges();
  }

  viewProductsFromCategory(categoryId: string): void {
    this.activeTab = 'products';
    this.categoryFilter = categoryId;
    this.selectedProductIds.clear();
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState({}, '', `/admin?tab=products&category=${encodeURIComponent(categoryId)}`);
    }
    this.cdr.detectChanges();
    setTimeout(() => {
      document.getElementById('admin-product-list-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }

  onProductImageChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.productForm.image = '/img/products/' + file.name;
      this.showMsg('Đã nhận file ' + file.name + '. Khi nộp thật, hãy đặt file vào thư mục img/products.', true);
    }
  }

  editProduct(product: Product): void {
    this.productForm = {
      id: product.id,
      name: product.name,
      category: product.category,
      image: product.images[0] || '/img/products/18.png',
      price: product.price,
      discountPrice: product.discountPrice,
      stock: product.stock,
      historicalPeriod: product.historicalPeriod,
      description: product.description
    };
    document.getElementById('admin-product-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  resetProductForm(): void {
    this.productForm = {
      id: '',
      name: '',
      category: 'boardgame',
      image: '/img/products/18.png',
      price: null,
      discountPrice: null,
      stock: null,
      historicalPeriod: '',
      description: ''
    };
  }

  async onSubmitProduct(): Promise<void> {
    try {
      await this.store.saveAdminProduct(this.productForm);
      this.resetProductForm();
      this.showMsg('Đã lưu sản phẩm.', true);
    } catch (err: any) {
      this.showMsg(err?.message || 'Không thể lưu sản phẩm.');
    }
  }

  async toggleProduct(productId: number): Promise<void> {
    try {
      await this.store.toggleProductVisibility(productId);
    } catch (err: any) {
      this.showMsg(err?.message || 'Lỗi thao tác.');
    }
  }

  isProductChecked(productId: number): boolean {
    return this.selectedProductIds.has(productId);
  }

  toggleProductCheck(productId: number, checked: boolean): void {
    if (checked) this.selectedProductIds.add(productId);
    else this.selectedProductIds.delete(productId);
  }

  toggleSelectAllProducts(checked: boolean): void {
    if (checked) {
      this.filteredProducts.forEach((p) => this.selectedProductIds.add(p.id));
    } else {
      this.selectedProductIds.clear();
    }
  }

  async deleteSelectedProducts(): Promise<void> {
    const ids = [...this.selectedProductIds];
    if (!ids.length) {
      this.showMsg('Vui lòng chọn ít nhất một sản phẩm để xóa.');
      return;
    }
    if (!window.confirm('Bạn có chắc chắn muốn xóa các sản phẩm đã chọn?')) return;
    try {
      await this.store.deleteProducts(ids);
      this.selectedProductIds.clear();
      this.showMsg('Đã xóa các sản phẩm đã chọn.', true);
    } catch (err: any) {
      this.showMsg(err?.message || 'Không thể xóa sản phẩm.');
    }
  }

  // ==================== CATEGORIES TAB ====================
  countProductsInCategory(categoryId: string): number {
    return this.products.filter((p) => p.category === categoryId).length;
  }

  async onSubmitCategory(): Promise<void> {
    try {
      await this.store.saveCategory(this.categoryForm);
      this.categoryForm = { name: '', description: '' };
      this.showMsg('Đã thêm danh mục.', true);
    } catch (err: any) {
      this.showMsg(err?.message || 'Không thể thêm danh mục.');
    }
  }

  async toggleCategory(categoryId: string): Promise<void> {
    try {
      await this.store.toggleCategory(categoryId);
    } catch (err: any) {
      this.showMsg(err?.message || 'Không thể cập nhật danh mục.');
    }
  }

  // ==================== INVENTORY WMS TAB (5 PILLARS) ====================
  // 1. Định mức tồn kho tối thiểu (Reorder Point - ROP)
  getMinStock(product: Product): number {
    if (product.minStock !== undefined && product.minStock !== null) {
      return Number(product.minStock);
    }
    if (product.category === 'boardgame') return 6;
    if (product.category === 'combo') return 5;
    return 8;
  }

  // 2. Quản lý Lô hàng (Batch/Lot) & Hạn bảo quản/kiểm định (FEFO)
  getBatchCode(product: Product): string {
    if (product.batchCode) return product.batchCode;
    const prefix = product.category === 'boardgame' ? 'LOT-BG' : (product.category === 'combo' ? 'LOT-CB' : 'LOT-PK');
    return `${prefix}-2026-0${((product.id - 1) % 4) + 1}`;
  }

  getImportDate(product: Product): string {
    if (product.importDate) return product.importDate;
    const dates = ['2026-08-15', '2026-09-05', '2026-09-20', '2026-10-10', '2026-10-25'];
    return dates[(product.id - 1) % dates.length];
  }

  getExpiryDate(product: Product): string {
    if (product.expiryDate) return product.expiryDate;
    // Thiết lập một số lô gần đến hạn bảo quản/kiểm định chất lượng để minh họa cảnh báo FEFO
    const expiries: Record<number, string> = {
      1: '2028-06-30',
      2: '2027-12-31',
      3: '2026-12-18', // Sắp đến hạn kiểm định định kỳ (FEFO)
      4: '2026-12-05', // Sắp đến hạn bảo quản (FEFO)
      5: '2028-03-15',
      6: '2028-05-20',
      7: '2027-09-30',
      8: '2026-12-25', // Sắp đến hạn kiểm định keo/mực in (FEFO)
      9: '2028-10-01',
      10: '2028-12-31',
      11: '2027-11-15',
      12: '2028-08-20',
      13: '2028-04-30',
      14: '2029-01-15'
    };
    return expiries[product.id] || '2027-12-31';
  }

  getBatchDaysLeft(product: Product): number {
    const exp = new Date(this.getExpiryDate(product) + 'T23:59:59').getTime();
    const now = Date.now();
    return Math.ceil((exp - now) / 86400000);
  }

  getBatchStatus(product: Product): { label: string; badgeClass: string; daysLeft: number; isWarning: boolean } {
    const daysLeft = this.getBatchDaysLeft(product);
    if (daysLeft <= 0) {
      return { label: 'Quá hạn kiểm định', badgeClass: 'status-badge--danger', daysLeft, isWarning: true };
    }
    if (daysLeft <= 60) {
      return { label: `Ưu tiên xuất FEFO (${daysLeft} ngày)`, badgeClass: 'status-badge--warning', daysLeft, isWarning: true };
    }
    return { label: `Còn hạn tốt (${daysLeft} ngày)`, badgeClass: 'status-badge--success', daysLeft, isWarning: false };
  }

  // 3. Quản lý Vị trí kho (Khu - Dãy - Kệ - Tầng)
  getWarehouseZone(product: Product): 'ZONE_A' | 'ZONE_B' | 'ZONE_C' {
    const loc = this.getWarehouseLocation(product);
    if (loc.startsWith('Khu A')) return 'ZONE_A';
    if (loc.startsWith('Khu B')) return 'ZONE_B';
    return 'ZONE_C';
  }

  getWarehouseLocation(product: Product): string {
    if (product.warehouseLocation) return product.warehouseLocation;
    if (product.category === 'boardgame') {
      return `Khu A · Dãy 01 · Kệ A${product.id}-T2`;
    }
    if (product.category === 'combo') {
      return `Khu B · Dãy 01 · Kệ B${product.id}-T1`;
    }
    if (product.category === 'merchandise') {
      return `Khu C · Dãy 01 · Kệ C${product.id}-T2`;
    }
    return `Khu C · Dãy 02 · Kệ C${product.id}-T3`;
  }

  // 4. Tính toán tự động Nhập - Xuất - Giữ chỗ - Khả dụng
  getProductInboundTotal(productId: number): number {
    return this.transactions
      .filter((tx) => tx.productId === productId && tx.change > 0)
      .reduce((sum, tx) => sum + Number(tx.change || 0), 0);
  }

  getProductOutboundTotal(productId: number): number {
    return this.transactions
      .filter((tx) => tx.productId === productId && tx.change < 0)
      .reduce((sum, tx) => sum + Math.abs(Number(tx.change || 0)), 0);
  }

  getProductOpeningStock(product: Product): number {
    const net = this.getProductInboundTotal(product.id) - this.getProductOutboundTotal(product.id);
    return Math.max(0, product.stock - net);
  }

  getProductReservedQty(productId: number): number {
    return this.orders
      .filter((o) => (o.status === 'PENDING' || o.status === 'CONFIRMED') && !o.stockDeducted)
      .reduce((sum, o) => {
        const item = (o.items || []).find((i) => i.productId === productId);
        return sum + (item ? Number(item.quantity || 0) : 0);
      }, 0);
  }

  getProductAvailableStock(product: Product): number {
    return Math.max(0, product.stock - this.getProductReservedQty(product.id));
  }

  getStockStatus(product: Product): { label: string; badgeClass: string; ratio: number } {
    const min = this.getMinStock(product);
    const ratio = min > 0 ? Math.min(100, Math.round((product.stock / (min * 3)) * 100)) : 100;
    if (product.stock <= 0) {
      return { label: 'Hết hàng (0)', badgeClass: 'status-badge--danger', ratio: 0 };
    }
    if (product.stock <= min) {
      return { label: `Chạm ngưỡng tối thiểu (≤ ${min})`, badgeClass: 'status-badge--warning', ratio: Math.max(15, ratio) };
    }
    return { label: 'An toàn', badgeClass: 'status-badge--success', ratio: Math.max(35, ratio) };
  }

  // 5. Báo cáo KPI Tồn kho Realtime
  get inventoryKpiSummary() {
    const totalSkus = this.products.length;
    const totalPhysicalUnits = this.products.reduce((sum, p) => sum + Number(p.stock || 0), 0);
    const totalReservedUnits = this.products.reduce((sum, p) => sum + this.getProductReservedQty(p.id), 0);
    const totalAvailableUnits = Math.max(0, totalPhysicalUnits - totalReservedUnits);
    const totalInventoryValue = this.products.reduce(
      (sum, p) => sum + Number(p.stock || 0) * Number(p.discountPrice ?? p.price ?? 0),
      0
    );
    const totalInboundUnits = this.transactions
      .filter((tx) => tx.change > 0)
      .reduce((sum, tx) => sum + Number(tx.change || 0), 0);
    const totalOutboundUnits = this.transactions
      .filter((tx) => tx.change < 0)
      .reduce((sum, tx) => sum + Math.abs(Number(tx.change || 0)), 0);
    const lowStockProducts = this.products.filter((p) => p.stock > 0 && p.stock <= this.getMinStock(p));
    const outOfStockProducts = this.products.filter((p) => p.stock <= 0);
    const fefoWarningProducts = this.products.filter((p) => this.getBatchStatus(p).isWarning);

    return {
      totalSkus,
      totalPhysicalUnits,
      totalReservedUnits,
      totalAvailableUnits,
      totalInventoryValue,
      totalInboundUnits,
      totalOutboundUnits,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      alertProducts: [...outOfStockProducts, ...lowStockProducts],
      fefoWarningCount: fefoWarningProducts.length,
      fefoWarningProducts
    };
  }

  get filteredInventoryProducts(): Product[] {
    const kw = this.inventorySearch.trim().toLowerCase();
    return this.products.filter((p) => {
      const loc = this.getWarehouseLocation(p).toLowerCase();
      const batch = this.getBatchCode(p).toLowerCase();
      const matchName =
        !kw ||
        p.name.toLowerCase().includes(kw) ||
        (p.sku || '').toLowerCase().includes(kw) ||
        loc.includes(kw) ||
        batch.includes(kw);
      if (!matchName) return false;

      if (this.inventoryZoneFilter !== 'ALL' && this.getWarehouseZone(p) !== this.inventoryZoneFilter) {
        return false;
      }

      const min = this.getMinStock(p);
      if (this.inventoryFilter === 'OUT') return p.stock <= 0;
      if (this.inventoryFilter === 'LOW') return p.stock > 0 && p.stock <= min;
      if (this.inventoryFilter === 'FEFO') return this.getBatchStatus(p).isWarning;
      if (this.inventoryFilter === 'OK') return p.stock > min;
      return true;
    });
  }

  get filteredTransactions(): InventoryTransaction[] {
    const kw = this.ledgerSearch.trim().toLowerCase();
    return this.transactions.filter((tx) => {
      if (this.ledgerTypeFilter !== 'ALL' && tx.type !== this.ledgerTypeFilter) return false;
      if (!kw) return true;
      const prodName = (this.store.getProduct(tx.productId)?.name || '').toLowerCase();
      const reason = (tx.reason || '').toLowerCase();
      const docCode = (tx.docCode || '').toLowerCase();
      const batch = (tx.batchCode || '').toLowerCase();
      return prodName.includes(kw) || reason.includes(kw) || docCode.includes(kw) || batch.includes(kw);
    });
  }

  transactionTypeLabel(type: string): string {
    const map: Record<string, string> = {
      IMPORT: 'Phiếu Nhập Kho',
      EXPORT: 'Phiếu Xuất Kho',
      SALE: 'Xuất Bán Đơn Hàng',
      ORDER_CANCEL: 'Hoàn Kho Hủy Đơn',
      CUSTOMER_RETURN: 'Nhập Hoàn Đổi Trả',
      AUDIT: 'Kiểm Kê Cân Bằng',
      ADJUSTMENT: 'Điều Chỉnh Kho'
    };
    return map[type] || type;
  }

  transactionBadgeClass(type: string, change: number): string {
    if (type === 'AUDIT') return 'status-badge--warning';
    return change >= 0 ? 'status-badge--success' : 'status-badge--danger';
  }

  openReceiptForProduct(product: Product, type: 'IMPORT' | 'EXPORT' = 'IMPORT'): void {
    const min = this.getMinStock(product);
    const suggestedQty = type === 'IMPORT' ? Math.max(10, min * 2 - product.stock) : 1;
    this.wmsReceiptForm = {
      type,
      productId: product.id,
      quantity: suggestedQty,
      batchCode: this.getBatchCode(product),
      importDate: new Date().toISOString().slice(0, 10),
      expiryDate: this.getExpiryDate(product),
      warehouseLocation: this.getWarehouseLocation(product),
      minStock: min,
      performer: 'Quản kho ẨN Store',
      reason: type === 'IMPORT' ? `Nhập bổ sung định mức lô ${this.getBatchCode(product)}` : `Xuất kho nội bộ / điều chuyển`
    };
    this.inventorySubTab = 'receipt';
  }

  onReceiptProductChange(): void {
    const prod = this.store.getProduct(Number(this.wmsReceiptForm.productId));
    if (!prod) return;
    this.wmsReceiptForm.batchCode = this.getBatchCode(prod);
    this.wmsReceiptForm.expiryDate = this.getExpiryDate(prod);
    this.wmsReceiptForm.warehouseLocation = this.getWarehouseLocation(prod);
    this.wmsReceiptForm.minStock = this.getMinStock(prod);
  }

  async submitWmsReceipt(): Promise<void> {
    const productId = Number(this.wmsReceiptForm.productId);
    const qty = Math.abs(Number(this.wmsReceiptForm.quantity || 0));
    if (!productId || !qty || Number.isNaN(qty)) {
      this.showMsg('Vui lòng chọn sản phẩm và nhập số lượng lớn hơn 0.');
      return;
    }
    const isOutbound = this.wmsReceiptForm.type === 'EXPORT';
    const signedChange = isOutbound ? -qty : qty;
    const reason = (this.wmsReceiptForm.reason || '').trim() || (isOutbound ? 'Xuất kho theo phiếu' : 'Nhập kho theo lô');

    try {
      await this.store.adjustInventory(productId, signedChange, this.wmsReceiptForm.type, reason, {
        minStock: Number(this.wmsReceiptForm.minStock || 5),
        batchCode: this.wmsReceiptForm.batchCode,
        importDate: this.wmsReceiptForm.importDate,
        expiryDate: this.wmsReceiptForm.expiryDate,
        warehouseLocation: this.wmsReceiptForm.warehouseLocation,
        performer: this.wmsReceiptForm.performer
      });
      this.lastRealtimeSyncAt = new Date().toLocaleTimeString('vi-VN');
      this.showMsg(
        `Đã ghi nhận ${isOutbound ? 'Phiếu Xuất Kho' : 'Phiếu Nhập Kho'} (${signedChange > 0 ? '+' + signedChange : signedChange} đv) cho sản phẩm #${productId}.`,
        true
      );
      this.inventorySubTab = 'overview';
    } catch (err: any) {
      this.showMsg(err?.message || 'Không thể lưu phiếu kho.');
    }
  }

  async quickRestockToSafeLevel(product: Product): Promise<void> {
    const min = this.getMinStock(product);
    const needed = Math.max(10, min * 2 - product.stock);
    try {
      await this.store.adjustInventory(
        product.id,
        needed,
        'IMPORT',
        `Nhập bù tự động vượt định mức tối thiểu (Định mức: ${min})`,
        {
          minStock: min,
          batchCode: `LOT-2026-R${product.id}`,
          importDate: new Date().toISOString().slice(0, 10),
          expiryDate: '2028-06-30',
          warehouseLocation: this.getWarehouseLocation(product)
        }
      );
      this.lastRealtimeSyncAt = new Date().toLocaleTimeString('vi-VN');
      this.showMsg(`Đã nhập bù tự động +${needed} sản phẩm "${product.name}" lên mức an toàn.`, true);
    } catch (err: any) {
      this.showMsg(err?.message || 'Không thể nhập bù tự động.');
    }
  }

  getAuditVariance(product: Product): number {
    const actual = this.auditActualCountMap[product.id];
    if (actual === undefined || actual === null || Number.isNaN(Number(actual))) return 0;
    return Number(actual) - product.stock;
  }

  async submitSingleAudit(product: Product): Promise<void> {
    const actual = Number(this.auditActualCountMap[product.id]);
    if (Number.isNaN(actual) || actual < 0) {
      this.showMsg('Số lượng kiểm kê thực tế không hợp lệ.');
      return;
    }
    const variance = actual - product.stock;
    const minStock = Number(this.minStockEditMap[product.id] ?? this.getMinStock(product));
    const warehouseLocation = this.locationEditMap[product.id] || this.getWarehouseLocation(product);
    const batchCode = this.batchEditMap[product.id] || this.getBatchCode(product);
    const expiryDate = this.expiryEditMap[product.id] || this.getExpiryDate(product);
    const note = (this.auditNoteMap[product.id] || '').trim() || `Kiểm kê thực tế tại ${warehouseLocation} (Thực kiểm: ${actual}, Hệ thống: ${product.stock})`;

    try {
      await this.store.adjustInventory(product.id, variance, 'AUDIT', note, {
        minStock,
        warehouseLocation,
        batchCode,
        expiryDate,
        performer: 'Tổ Kiểm kê ẨN Store'
      });
      this.lastRealtimeSyncAt = new Date().toLocaleTimeString('vi-VN');
      this.showMsg(
        variance === 0
          ? `Đã cập nhật định mức (${minStock}), vị trí (${warehouseLocation}) & xác nhận khớp tồn kho cho "${product.name}".`
          : `Đã cân bằng kiểm kê (${variance > 0 ? '+' + variance : variance}) cho "${product.name}".`,
        true
      );
    } catch (err: any) {
      this.showMsg(err?.message || 'Không thể cân bằng kiểm kê.');
    }
  }

  async refreshInventoryRealtime(): Promise<void> {
    await this.store.syncStateFromBackend();
    this.lastRealtimeSyncAt = new Date().toLocaleTimeString('vi-VN');
    this.showMsg(`Đã đồng bộ dữ liệu tồn kho Realtime lúc ${this.lastRealtimeSyncAt}.`, true);
  }

  exportInventoryCsv(): void {
    const headers = [
      'Mã SP',
      'SKU',
      'Tên sản phẩm',
      'Vị trí lưu kho',
      'Mã lô (Batch)',
      'Ngày nhập lô',
      'Hạn bảo quản',
      'Tồn đầu kỳ',
      'Tổng Nhập',
      'Tổng Xuất',
      'Tồn thực tế',
      'Đang giữ chỗ',
      'Tồn khả dụng',
      'Định mức tối thiểu (ROP)',
      'Đơn giá',
      'Giá trị tồn kho',
      'Trạng thái tồn'
    ];
    const rows = this.products.map((p) => {
      const price = Number(p.discountPrice ?? p.price ?? 0);
      return [
        p.id,
        p.sku || `AN-${p.id}`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${this.getWarehouseLocation(p)}"`,
        this.getBatchCode(p),
        this.getImportDate(p),
        this.getExpiryDate(p),
        this.getProductOpeningStock(p),
        this.getProductInboundTotal(p.id),
        this.getProductOutboundTotal(p.id),
        p.stock,
        this.getProductReservedQty(p.id),
        this.getProductAvailableStock(p),
        this.getMinStock(p),
        price,
        p.stock * price,
        `"${this.getStockStatus(p).label}"`
      ].join(',');
    });
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bao_Cao_Nhap_Xuat_Ton_AN_Store_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.showMsg('Đã xuất file Báo cáo Nhập - Xuất - Tồn (.CSV) thành công.', true);
  }

  async adjustStock(productId: number, change: number, customReason?: string): Promise<void> {
    const amount = Number(change);
    if (!amount || Number.isNaN(amount)) {
      this.showMsg('Vui lòng nhập số lượng điều chỉnh khác 0.');
      return;
    }
    const reason = (customReason || this.inventoryCustomReason[productId] || '').trim() || (amount > 0 ? 'Nhập bổ sung kho' : 'Xuất điều chỉnh kho');
    const type = amount > 0 ? 'IMPORT' : 'EXPORT';
    try {
      await this.store.adjustInventory(productId, amount, type, reason);
      this.inventoryCustomQty[productId] = 0;
      this.inventoryCustomReason[productId] = '';
      this.lastRealtimeSyncAt = new Date().toLocaleTimeString('vi-VN');
      this.showMsg(`Đã điều chỉnh tồn kho (${amount > 0 ? '+' + amount : amount}) cho sản phẩm #${productId}.`, true);
    } catch (err: any) {
      this.showMsg(err?.message || 'Không thể điều chỉnh tồn kho.');
    }
  }

  // ==================== ORDERS TAB ====================
  get selectedOrder(): Order | null {
    if (!this.selectedOrderId) return null;
    return this.orders.find((o) => o.id === this.selectedOrderId) || null;
  }

  adminPaymentLabel(order: Order): string {
    if (order.paymentMethod === 'COD' && order.status !== 'DELIVERED') return 'COD - Chưa thu tiền';
    if (order.paymentMethod === 'COD' && order.status === 'DELIVERED') return 'COD - Đã thu tiền';
    return this.store.statusLabel(order.paymentStatus);
  }

  allowedOrderStatuses(order: Order): string[] {
    return order.status === 'SHIPPING'
      ? ['SHIPPING', 'DELIVERED']
      : ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED'];
  }

  async updateOrderStatus(orderId: number, status?: string): Promise<void> {
    const nextStatus = status || this.orderStatusMap[orderId];
    if (!nextStatus) return;
    try {
      await this.store.updateOrderStatus(orderId, nextStatus);
      this.showMsg('Đã cập nhật trạng thái đơn hàng.', true);
    } catch (err: any) {
      this.showMsg(err?.message || 'Không thể cập nhật đơn hàng.');
    }
  }

  async resolveCancellation(orderId: number, decision: 'APPROVED' | 'REJECTED'): Promise<void> {
    try {
      await this.store.resolveCancellationRequest(orderId, decision);
      this.showMsg('Đã xử lý yêu cầu hủy đơn.', true);
    } catch (err: any) {
      this.showMsg(err?.message || 'Không thể xử lý yêu cầu hủy.');
    }
  }

  // ==================== VOUCHERS TAB ====================
  get activeVoucherCount(): number {
    return this.vouchers.filter((v) => v.status === 'ACTIVE').length;
  }

  get usedVoucherTotal(): number {
    return this.vouchers.reduce((sum, v) => sum + Number(v.usedCount || 0), 0);
  }

  async onSubmitVoucher(): Promise<void> {
    try {
      await this.store.saveVoucher(this.voucherForm);
      this.voucherForm = {
        code: '',
        name: '',
        type: 'percentage',
        value: null,
        maxDiscount: null,
        minOrder: 0,
        startAt: '',
        endAt: '',
        usageLimit: 100
      };
      this.showMsg('Đã lưu promotion / voucher.', true);
    } catch (err: any) {
      this.showMsg(err?.message || 'Không thể lưu voucher.');
    }
  }

  async toggleVoucher(code: string): Promise<void> {
    try {
      await this.store.toggleVoucher(code);
    } catch (err: any) {
      this.showMsg(err?.message || 'Không thể cập nhật voucher.');
    }
  }

  // ==================== RETURNS TAB ====================
  previewEvidenceUrl: string | null = null;

  getEvidenceImages(req: any): string[] {
    if (!req) return [];
    if (Array.isArray(req.evidenceImages) && req.evidenceImages.length) {
      return req.evidenceImages.filter((x: any) => Boolean(x));
    }
    if (req.evidenceImage) return [req.evidenceImage];
    if (req.evidenceName) {
      const name = String(req.evidenceName).trim();
      if (!name) return [];
      if (name.startsWith('data:') || name.startsWith('http') || name.startsWith('/')) {
        return [name];
      }
      return ['/img/products/' + name];
    }
    return [];
  }

  async resolveReturn(returnId: number, status: 'APPROVED' | 'REJECTED'): Promise<void> {
    const targetReq = this.returns.find((r) => r.id === returnId);
    if (status === 'APPROVED' && (!targetReq || !this.getEvidenceImages(targetReq).length)) {
      this.showMsg('Không thể duyệt: Yêu cầu đổi/trả bắt buộc phải có ít nhất 01 ảnh minh chứng từ khách hàng.');
      return;
    }

    const rawNote = this.returnNotes[returnId] || '';
    const note = status === 'APPROVED' ? (rawNote || 'Đã duyệt và nhập lại kho.') : rawNote;
    try {
      await this.store.resolveReturn(returnId, status, note);
      this.showMsg('Đã xử lý yêu cầu đổi/trả.', true);
    } catch (err: any) {
      this.showMsg(err?.message || 'Không thể xử lý đổi/trả.');
    }
  }

  // ==================== REVIEWS TAB ====================
  reviewSentiment(comment: string): string[] {
    const text = String(comment || '').toLowerCase();
    const goodWords = [
      'tốt', 'xịn', 'đáng tiền', 'đúng mô tả', 'hài lòng',
      'tuyệt vời', 'giao nhanh', 'đóng gói', 'nhiệt tình',
      'sẽ mua lại', 'recommend', 'good', 'nice', 'perfect'
    ];
    return goodWords.filter((word) => text.includes(word));
  }

  get reviewStats() {
    const total = this.reviews.length;
    const average = total
      ? (this.reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / total).toFixed(1)
      : '0.0';
    const goodKeywordsCount = this.reviews.flatMap((r) => this.reviewSentiment(r.comment)).length;
    const byStar = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: this.reviews.filter((r) => Number(r.rating) === star).length
    }));
    const productRows = this.products
      .map((product) => {
        const reviews = this.reviews.filter((r) => r.productId === product.id);
        const sold = this.orders
          .flatMap((o) => o.items)
          .filter((i) => i.productId === product.id)
          .reduce((sum, i) => sum + i.quantity, 0);
        const revenue = this.orders
          .flatMap((o) => o.items)
          .filter((i) => i.productId === product.id)
          .reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
        const avg = reviews.length
          ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
          : '-';
        return { product, reviews, sold, revenue, avg };
      })
      .filter((row) => row.reviews.length || row.sold)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 6);

    return { total, average, goodKeywordsCount, byStar, productRows };
  }

  get filteredReviews(): Review[] {
    if (this.starFilter === 'all') return this.reviews;
    return this.reviews.filter((r) => String(r.rating) === this.starFilter);
  }

  onReviewStarFilterChange(val: string): void {
    this.switchTab('reviews', { rating: val });
  }

  starString(rating: number): string {
    return '★'.repeat(Math.max(0, Number(rating || 0)));
  }

  async toggleReview(reviewId: number): Promise<void> {
    try {
      await this.store.toggleReview(reviewId);
    } catch (err: any) {
      this.showMsg(err?.message || 'Không thể cập nhật đánh giá.');
    }
  }

  // ==================== BLOGS TAB (Bug #21) ====================
  openBlogPreview(post: BlogPost): void {
    this.previewBlogPost = post;
  }

  closeBlogPreview(): void {
    this.previewBlogPost = null;
  }

  async publishFromPreview(post: BlogPost): Promise<void> {
    await this.toggleBlog(post.id);
    this.previewBlogPost = null;
    this.showMsg(`Đã xuất bản bài viết "${post.title}" lên trang chủ & Blog!`, true);
  }

  async onSubmitAdminBlog(status: 'DRAFT' | 'PUBLISHED'): Promise<void> {
    try {
      await this.store.addBlog(this.blogForm, status);
      this.blogForm = { title: '', excerpt: '' };
      this.showMsg('Đã lưu bài viết.', true);
    } catch (err: any) {
      this.showMsg(err?.message || 'Không thể lưu bài viết.');
    }
  }

  async toggleBlog(blogId: number | string): Promise<void> {
    try {
      await this.store.toggleBlog(blogId);
    } catch (err: any) {
      this.showMsg(err?.message || 'Không thể đăng bài viết.');
    }
  }

  async resolveUserBlog(submissionId: number, status: 'APPROVED' | 'REJECTED'): Promise<void> {
    const note = this.userBlogNotes[submissionId] || '';
    try {
      await this.store.resolveUserBlog(submissionId, status, note);
      this.showMsg('Đã xử lý bài viết cộng đồng.', true);
    } catch (err: any) {
      this.showMsg(err?.message || 'Không thể xử lý bài viết.');
    }
  }

  // ==================== ADVISOR TAB (TƯ VẤN VIÊN & CẢM XÚC KHÁCH HÀNG) ====================
  get advisorTickets(): any[] {
    return this.store.advisorTickets$.value || [];
  }

  get advisorStats() {
    const list = this.advisorTickets;
    const redCount = list.filter((t) => t.emotionLevel === 'RED').length;
    const orangeCount = list.filter((t) => t.emotionLevel === 'ORANGE').length;
    const greenCount = list.filter((t) => t.emotionLevel === 'GREEN').length;
    const pendingCount = list.filter((t) => t.status === 'PENDING').length;
    return {
      total: list.length,
      redCount,
      orangeCount,
      greenCount,
      pendingCount
    };
  }

  get filteredAdvisorTickets(): any[] {
    return this.advisorTickets.filter((t) => {
      if (this.advisorEmotionFilter !== 'ALL' && t.emotionLevel !== this.advisorEmotionFilter) {
        return false;
      }
      return true;
    });
  }

  applyQuickAdvisorReply(ticket: any, templateType: 'APOLOGIZE_COMPENSATE' | 'EXPEDITE_SHIPPING' | 'CONSULT_GIFT'): void {
    if (templateType === 'APOLOGIZE_COMPENSATE') {
      this.advisorReplyMap[ticket.id] =
        `Chào bạn ${ticket.customerName}, ẨN Store thành thật xin lỗi vì sự cố khiến bạn bức xúc! Mình đã lập phiếu ưu tiên đổi mới 1-1 miễn phí tận nơi và gửi tặng bạn mã giảm giá 150.000 ₫ (LECHI150) để bù đắp trải nghiệm ạ.`;
    } else if (templateType === 'EXPEDITE_SHIPPING') {
      this.advisorReplyMap[ticket.id] =
        `Chào bạn ${ticket.customerName}, Tư vấn viên đã liên hệ trực tiếp điều phối viên bưu cục để giục giao gấp đơn hàng của bạn ngay trong chiều nay. Cảm ơn bạn đã kiên nhẫn chờ đợi ạ!`;
    } else {
      this.advisorReplyMap[ticket.id] =
        `Chào bạn ${ticket.customerName}, Tư vấn viên đã ghi nhận yêu cầu của bạn và hỗ trợ đóng gói hộp quà cổ phong kèm thiệp dấu sáp miễn phí nhé ạ!`;
    }
  }

  async submitAdvisorReply(ticket: any, nextEmotion: 'GREEN' | 'ORANGE' | 'RED' = 'GREEN'): Promise<void> {
    const reply = (this.advisorReplyMap[ticket.id] || '').trim();
    if (!reply) {
      this.showMsg('Vui lòng nhập nội dung phản hồi hoặc chọn mẫu câu xoa dịu nhanh trước khi gửi.');
      return;
    }
    try {
      await this.store.replyAdvisorTicket(ticket.id, reply, 'RESOLVED', nextEmotion);
      this.advisorReplyMap[ticket.id] = '';
      this.showMsg(`Đã gửi phản hồi Tư vấn viên & cập nhật cảm xúc KH #${ticket.ticketCode} sang mức ổn định!`, true);
    } catch (err: any) {
      this.showMsg(err?.message || 'Không thể gửi phản hồi tư vấn viên.');
    }
  }
}
