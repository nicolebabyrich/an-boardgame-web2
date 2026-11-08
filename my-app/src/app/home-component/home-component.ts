import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreApiService } from '../services/store-api.service';
import { Product } from '../classes/Product';
import { Category } from '../classes/Category';
import { BlogPost } from '../classes/BlogPost';

interface CharacterProfile {
  title: string;
  displayTitle: string;
  image: string;
  model3d: string;
  story: string;
}

interface ClueOption {
  id: string;
  code: string;
  icon: string;
  spotLabel: string;
  roomX: string;
  roomY: string;
  title: string;
  location: string;
  npcName: string;
  npcRole: string;
  npcAvatar: string;
  npcBubble: string;
  npcDialogue: string;
  summary: string;
  forensicNote: string;
}

interface SuspectOption {
  id: string;
  role: string;
  name: string;
  avatar: string;
  roomX: string;
  roomY: string;
  bubbleShort: string;
  alibi: string;
  detectiveQuestion: string;
  suspectReaction: string;
  contradiction: string;
  confessionBubble: string;
}

@Component({
  selector: 'app-home-component',
  standalone: false,
  templateUrl: './home-component.html',
  styleUrl: './home-component.css'
})
export class HomeComponent implements OnInit {
  newsletterEmail = '';
  newsletterMessage = '';
  newsletterError = '';
  newsletterSubmitting = false;

  // ==================== CHIA TỪNG CỤC (CHƯƠNG MỤC) TRANG CHỦ THEO MẠCH CỐT TRUYỆN ====================
  activeHomeSection: 'story' | 'simulation' | 'characters' | 'guide' | 'offers' = 'story';

  readonly homeSectionTabs: Array<{
    key: 'story' | 'simulation' | 'characters' | 'guide' | 'offers';
    icon: string;
    label: string;
    subtitle: string;
  }> = [
    { key: 'story', icon: '📜', label: 'Cốt truyện', subtitle: 'Biến cố Lệ Chi Viên 1442' },
    { key: 'simulation', icon: '🕯️', label: 'Phòng án mô phỏng', subtitle: 'Chơi thử phá án tại Tẩm Điện' },
    { key: 'characters', icon: '🎭', label: 'Hồ sơ nhân chứng', subtitle: '5 Nhân vật & Tượng 3D' },
    { key: 'guide', icon: '🧭', label: 'Cách chơi', subtitle: '4 Hồi điều tra trên bàn chơi' },
    { key: 'offers', icon: '🧧', label: 'Lưu trữ & Ưu đãi', subtitle: 'Mật lệnh tháng & Giai thoại' }
  ];

  readonly howToPlaySteps = [
    {
      act: 'HỒI I · GIỜ HỢI',
      title: 'Khai Mở Mật Chỉ<br>&amp; Nhập Vai Bí Mật',
      desc: 'Mỗi người chơi nhận 01 Mật Chỉ niêm phong xác định thân phận đêm đó: Điều Tra Viên Đại Lý Tự, Nhân Chứng Mang Tâm Sự, hoặc Kẻ Thủ Ác ẩn mình trong đoàn hộ giá. Không ai biết ai là đồng minh thực sự.'
    },
    {
      act: 'HỒI II · GIỜ TÝ',
      title: 'Khám Nghiệm Tẩm Điện<br>&amp; Lật Thẻ Vật Chứng',
      desc: 'Qua 3 vòng canh giờ, từng người dùng Lệnh Bài Hành Động để lục soát Bàn Trà Đông Các, Chân Đèn Đồng, hay Hậu Viên. Người chơi có quyền công bố toàn bộ sự thật hoặc cố tình giấu nhẹm một nửa manh mối.'
    },
    {
      act: 'HỒI III · GIỜ SỬU',
      title: 'Đối Chất Đông Các<br>&amp; Bẻ Gãy Lời Khai',
      desc: 'Đặt các thẻ Vật Chứng và Lịch Trình Canh Gác lên bàn tròn để chất vấn lẫn nhau. Sử dụng Kỹ Năng Độc Bản của từng nhân vật lịch sử để ép đối phương lộ sơ hở trong bằng chứng ngoại phạm.'
    },
    {
      act: 'HỒI IV · TRƯỚC BÌNH MINH',
      title: 'Niêm Phong Án Văn<br>&amp; Định Tội',
      desc: 'Trước khi tiếng trống canh năm vang lên, toàn bộ bàn chơi đồng loạt bỏ phiếu chỉ định Hung Thủ và Vật Chứng Gây Án. Chỉ một suy luận lệch hướng, kẻ chủ mưu sẽ xóa sạch dấu vết và thoát khỏi Lệ Chi Viên!'
    }
  ];

  readonly secretFactions = [
    {
      badge: 'PHE CHÍNH TRỰC',
      name: 'Thám Tử Đại Lý Tự',
      goal: 'Đối chiếu 60 thẻ manh mối, tìm đúng cặp [Hung Thủ + Hung Khí + Động Cơ] trước khi hết canh tư để minh oan cho người vô tội.'
    },
    {
      badge: 'PHE ẨN MÌNH',
      name: 'Kẻ Thủ Ác & Nội Gián',
      goal: 'Ngụy tạo lời khai giả, tung hỏa mù đổ tội cho một nhân chứng khác hoặc làm nhiễu loạn cuộc bỏ phiếu của Đại Lý Tự.'
    },
    {
      badge: 'PHE TRUNG LẬP',
      name: 'Nhân Chứng Giữ Bí Mật Riêng',
      goal: 'Vừa hỗ trợ phá án, vừa phải che giấu bí mật cá nhân nhạy cảm trong đêm Lệ Chi Viên để bảo toàn danh dự gia tộc.'
    }
  ];

  // ==================== MINI-GAME MÔ PHỎNG CĂN PHÒNG HIỆN TRƯỜNG LỆ CHI VIÊN ====================
  miniGameStep: 1 | 2 | 3 = 1;
  activeRoomClueId: string | null = 'teacup';
  inspectedClueIds = new Set<string>(['teacup']);
  selectedClueId: string | null = null;
  activeRoomSuspectId: string | null = 'healer';
  selectedSuspectId: string | null = null;

  readonly clueOptions: ClueOption[] = [
    {
      id: 'letter',
      code: 'MANH MỐI #01',
      icon: '🕯️',
      spotLabel: 'Chân đèn đồng',
      roomX: '20%',
      roomY: '48%',
      title: 'Mảnh mật thư cháy dở dưới chân đèn',
      location: 'Góc Tây Tẩm Điện · Chân đèn đồng',
      npcName: 'Ức Trai Tiên Sinh',
      npcRole: 'Người chứng hiện trường',
      npcAvatar: '/img/profile/nhanvat%20%40uctraitiensinh.png',
      npcBubble: '“Đại nhân lại đây! Dưới chân đèn có mảnh giấy tuyên thành vừa bị đốt vội!”',
      npcDialogue: '“Lão phu vừa bước vào đã ngửi thấy mùi khói giấy tuyên thành - loại giấy chỉ Nội các và Cẩm Y Vệ mới được cấp. Kẻ thủ ác đã đốt mật lệnh đổi ca gác cổng Đông ngay tại chân đèn này!”',
      summary: 'Giấy tuyên thành cao cấp còn sót dòng chữ chu sa: "Đổi ca cổng Đông - Giờ Sửu".',
      forensicNote: 'Ấn tín giả tạo khoảng trống canh phòng đúng 15 phút để kẻ nội gián mở lối từ hậu viên vào tẩm điện.'
    },
    {
      id: 'teacup',
      code: 'MANH MỐI #02',
      icon: '🍵',
      spotLabel: 'Bàn trà Ngự dụng',
      roomX: '50%',
      roomY: '56%',
      title: 'Chén trà ngự dụng nứt vỡ',
      location: 'Giữa Tẩm Điện · Bàn án Đông Các',
      npcName: 'Lễ Nghi Học Sĩ',
      npcRole: 'Người hầu trà đêm án mạng',
      npcAvatar: '/img/profile/nhanvat%20%40lenghihocsi.png',
      npcBubble: '“Khoan chạm tay vào! Cặn trà tím sẫm và tỏa mùi hạnh nhân đắng lạ lắm...”',
      npcDialogue: '“Chén trà này khi dâng lên đã được thử bằng trâm bạc mà không hề đổi màu. Nhưng đại nhân nhìn vết nứt trên thành chén xem - đó là kỳ độc Ô Đầu Tây Vực chỉ phát tác sau đúng 1 khắc khi gặp nhiệt!”',
      summary: 'Cặn trà đọng sắc tím sẫm, tỏa mùi hạnh nhân đắng thoang thoảng dù kim bạc không đổi màu.',
      forensicNote: 'Độc Ô Đầu Tây Vực pha mật nhãn không phản ứng với trâm bạc, chỉ có bậc tinh thông y lý trong cung mới bào chế được.'
    },
    {
      id: 'pollen',
      code: 'MANH MỐI #03',
      icon: '🌸',
      spotLabel: 'Rèm lụa Hậu Viên',
      roomX: '80%',
      roomY: '42%',
      title: 'Vết phấn hoa Dạ Hương trên rèm lụa',
      location: 'Cửa sổ phía Đông · Lối ra Hậu Viên',
      npcName: 'Mẫu Nghi Thiên Hạ',
      npcRole: 'Chủ quản Nội cung',
      npcAvatar: '/img/profile/nhanvat%20%40maunghithienha.png',
      npcBubble: '“Trên mép rèm lụa vương đầy phấn hoa Dạ Hương chỉ nở sau canh hai rưỡi!”',
      npcDialogue: '“Hoa Dạ Hương ở hậu viên chỉ bung phấn vào nửa đêm về sáng. Kẻ nào khai đã rời tẩm điện từ đầu canh hai mà trên áo lại vương thứ phấn hoa vàng óng này thì chắc chắn đang nói dối!”',
      summary: 'Bụi phấn vàng óng bám dọc mép rèm nơi gió lùa, kèm vết xước mảnh do trâm cài vàng.',
      forensicNote: 'Bác bỏ hoàn toàn lời khai ngoại phạm của bất kỳ ai tự nhận đã rời Lệ Chi Viên từ đầu canh hai.'
    }
  ];

  readonly suspectOptions: SuspectOption[] = [
    {
      id: 'healer',
      role: 'NGHI PHẠM A · NGỰ Y TRỰC ĐÊM',
      name: 'Quan Thái Y Trực Đêm',
      avatar: '/img/profile/nhanvat%20%40tuongquancamvebinh.png',
      roomX: '21%',
      roomY: '50%',
      bubbleShort: '“Hạ thần đã thử độc bằng trâm bạc trước mặt mọi người rồi!”',
      alibi: '“Bẩm đại nhân, hạ thần đã dùng trâm bạc thử trà lúc canh hai, kim bạc hoàn toàn sáng bóng không hề đổi màu!”',
      detectiveQuestion: '“Ngươi lấy trâm bạc ra làm bình phong ư? Chỉ bậc Ngự y như ngươi mới biết kỳ độc Ô Đầu Tây Vực tinh luyện không hề làm đen bạc!”',
      suspectReaction: '“(Biến sắc, lùi lại một bước) Đại... đại nhân sao lại biết phương thuốc mật truyền từ Tây Vực đó?!”',
      contradiction: 'Thái Y là người duy nhất nắm giữ dược tính Ô Đầu Tây Vực và trực tiếp kê đơn trà an thần tối hôm đó.',
      confessionBubble: '“Hạ thần chỉ nhận lệnh pha trà... Còn kẻ trao gói kỳ độc Tây Vực cho hạ thần vẫn đang ẩn mặt trong triều!”'
    },
    {
      id: 'consort',
      role: 'NGHI PHẠM B · NỘI CUNG THỊ NỮ',
      name: 'Thị Nội Cung Tần',
      avatar: '/img/profile/nhanvat%20%40lenghihocsi.png',
      roomX: '50%',
      roomY: '54%',
      bubbleShort: '“Thiếp đã về Tây cung từ đầu canh hai, nào có bước qua hậu viên!”',
      alibi: '“Nô tỳ lui khỏi tẩm điện từ đầu canh hai, suốt đêm chỉ ở khuê phòng phía Tây, nửa bước cũng không qua hậu viên.”',
      detectiveQuestion: '“Nếu nàng đã rời đi từ đầu canh hai, tại sao trên tà áo và trâm cài của nàng lại vương phấn hoa Dạ Hương chỉ nở lúc canh ba trên rèm lụa?”',
      suspectReaction: '“(Hoảng hốt giấu tay áo) Phấn... phấn hoa này... Thiếp chỉ quay lại tìm chiếc trâm đánh rơi thôi!”',
      contradiction: 'Tà áo lụa và trâm cài vương đầy phấn hoa Dạ Hương trùng khớp với vết xước trên rèm lụa cửa sau tẩm điện.',
      confessionBubble: '“Thiếp quả thực đã quay lại tẩm điện lúc canh ba... nhưng khi thiếp vén rèm thì đã thấy một bóng đen khác rời đi trước!”'
    },
    {
      id: 'guard',
      role: 'NGHI PHẠM C · KIỂM SOÁT CỔNG ĐÔNG',
      name: 'Đội Trưởng Cẩm Y Vệ',
      avatar: '/img/profile/nhanvat%20%40canvehoangcung.png',
      roomX: '79%',
      roomY: '48%',
      bubbleShort: '“Cổng Đông khóa chặt suốt canh ba, không ai lọt qua được!”',
      alibi: '“Thuộc hạ giữ chặt cổng Đông suốt canh ba, không một bóng người lạ mặt nào lọt qua vòng vây cấm quân!”',
      detectiveQuestion: '“Giữ chặt suốt canh ba ư? Vậy mảnh mật thư giấy tuyên thành cháy dở dưới chân đèn ghi lệnh rút chốt cổng Đông 15 phút giờ Sửu là của ai?!”',
      suspectReaction: '“(Toát mồ hôi lạnh, nắm chặt chuôi đao) Mật thư đó... thuộc hạ tưởng đã đốt thành tro dưới chân đèn rồi chứ?!”',
      contradiction: 'Sổ trực và mảnh mật thư cháy dở chứng minh Đội trưởng đã tự ý rút chốt canh cổng Đông đúng 15 phút trước khi phát hiện biến cố.',
      confessionBubble: '“Thuộc hạ buộc phải mở cổng Đông vì bức mật lệnh đó đóng ấn ngọc của một nhân vật quyền lực bậc nhất triều đình!”'
    }
  ];

  readonly categoryImages: Record<string, string> = {
    boardgame: '/img/products/23.png',
    combo: '/img/products/21.png',
    merchandise: '/img/products/5.png',
    accessory: '/img/products/12.png'
  };

  readonly characterProfiles: CharacterProfile[] = [
    {
      title: 'Ức Trai Tiên Sinh',
      displayTitle: 'Ức Trai<br>Tiên Sinh',
      image: '/img/profile/nhanvat%20%40uctraitiensinh.png',
      model3d: '/img/3d/profile/uc-trai-tien-sinh.glb',
      story: 'Nguyễn Trãi giữ vai trò người chứng quan trọng trong vụ án Lệ Chi Viên. Những ghi chép và mật thư ông để lại có thể mở ra manh mối quyết định.'
    },
    {
      title: 'Lễ Nghi Học Sĩ',
      displayTitle: 'Lễ Nghi<br>Học Sĩ',
      image: '/img/profile/nhanvat%20%40lenghihocsi.png',
      model3d: '/img/3d/profile/le-nghi-hoc-si.glb',
      story: 'Nguyễn Thị Lộ là nhân vật ở gần trung tâm biến cố. Sự am hiểu lễ nghi và những chi tiết bất thường trong đêm án mạng khiến hồ sơ của bà cần được đọc thật kỹ.'
    },
    {
      title: 'Mẫu Nghi Thiên Hạ',
      displayTitle: 'Mẫu Nghi<br>Thiên Hạ',
      image: '/img/profile/nhanvat%20%40maunghithienha.png',
      model3d: '/img/3d/profile/mau-nghi-thien-ha.glb',
      story: 'Người đứng ở vị trí mẫu nghi nắm giữ quyền lực hậu cung và nhiều mối quan hệ kín. Đằng sau dáng vẻ điềm tĩnh là những động cơ cần được điều tra.'
    },
    {
      title: 'Cận Vệ Hoàng Cung',
      displayTitle: 'Cận Vệ<br>Hoàng Cung',
      image: '/img/profile/nhanvat%20%40canvehoangcung.png',
      model3d: '/img/3d/profile/can-ve-hoang-cung.glb',
      story: 'Cận vệ hoàng cung kiểm soát lối ra vào và lịch trình canh phòng. Lời khai của nhân vật này có thể xác định ai đã xuất hiện gần hiện trường.'
    },
    {
      title: 'Tướng Quân Cấm Vệ Binh',
      displayTitle: 'Tướng Quân<br>Cấm Vệ Binh',
      image: '/img/profile/nhanvat%20%40tuongquancamvebinh.png',
      model3d: '/img/3d/profile/tuong-quan-cam-ve-binh.glb',
      story: 'Vị tướng cấm vệ binh nắm binh quyền và bảo vệ vòng ngoài hoàng cung. Một dấu vết trên vũ khí của ông có thể liên kết nhiều bí mật bị che giấu.'
    }
  ];

  constructor(
    public store: StoreApiService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.updateActiveSectionFromUrl();
    this.route.queryParamMap.subscribe(() => {
      this.updateActiveSectionFromUrl();
    });
    this.route.data.subscribe((data) => {
      if (data && data['section']) {
        this.activeHomeSection = data['section'];
        this.cdr.detectChanges();
      }
    });
  }

  private updateActiveSectionFromUrl(): void {
    const rawPath = this.router.url.split('?')[0].replace(/^\//, '');
    const querySec = this.route.snapshot.queryParamMap.get('section') as any;

    if (rawPath === 'simulation' || querySec === 'simulation') {
      this.activeHomeSection = 'simulation';
    } else if (rawPath === 'characters' || querySec === 'characters') {
      this.activeHomeSection = 'characters';
    } else if (rawPath === 'guide' || querySec === 'guide') {
      this.activeHomeSection = 'guide';
    } else if (querySec === 'offers') {
      this.activeHomeSection = 'offers';
    } else {
      this.activeHomeSection = 'story';
    }
    this.cdr.detectChanges();
  }

  switchHomeSection(sec: 'story' | 'simulation' | 'characters' | 'guide' | 'offers', _scrollToContent = true): void {
    this.activeHomeSection = sec;
    const targetPath = sec === 'story' ? '/home' : `/${sec}`;
    this.router.navigate([targetPath]);
    this.cdr.detectChanges();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  get featuredProducts(): Product[] {
    return this.store.getProducts().filter((p) => p.featured).slice(0, 4);
  }

  get visibleCategories(): Category[] {
    return this.store.categories$.value.filter((c) => c.id !== 'all' && !c.hidden);
  }

  get publishedBlogs(): BlogPost[] {
    return this.store.getPublishedBlogs().slice(0, 3);
  }

  getProductCountByCategory(categoryId: string): number {
    return this.store.getProducts().filter((p) => p.category === categoryId).length;
  }

  isSoldOut(product: Product): boolean {
    return product.status === 'OUT_OF_STOCK' || product.stock <= 0;
  }

  addToCart(productId: number): void {
    try {
      this.store.addToCart(productId, 1);
      this.store.showToast('Đã thêm sản phẩm vào giỏ hàng.', false, 'Xem giỏ hàng', '/cart');
    } catch (err: any) {
      this.store.showToast(err.message || 'Không thể thêm vào giỏ.', true);
    }
  }

  buyNow(productId: number): void {
    try {
      this.store.addToCart(productId, 1, 'Bản Tiêu Chuẩn');
      this.router.navigate(['/checkout']);
    } catch (err: any) {
      this.store.showToast(err.message || 'Không thể mua ngay sản phẩm này.', true);
    }
  }

  copyVoucher(code: string): void {
    this.store.copyVoucherCode(code);
  }

  // ==================== LOGIC MINI-GAME MÔ PHỎNG CĂN PHÒNG ====================
  get activeRoomClue(): ClueOption {
    return this.clueOptions.find((c) => c.id === this.activeRoomClueId) || this.clueOptions[1];
  }

  get selectedClue(): ClueOption | undefined {
    return this.clueOptions.find((c) => c.id === (this.selectedClueId || this.activeRoomClueId));
  }

  get activeRoomSuspect(): SuspectOption {
    return this.suspectOptions.find((s) => s.id === this.activeRoomSuspectId) || this.suspectOptions[0];
  }

  get selectedSuspect(): SuspectOption | undefined {
    return this.suspectOptions.find((s) => s.id === (this.selectedSuspectId || this.activeRoomSuspectId));
  }

  inspectClueInRoom(clueId: string): void {
    this.activeRoomClueId = clueId;
    this.inspectedClueIds.add(clueId);
  }

  isClueInspected(clueId: string): boolean {
    return this.inspectedClueIds.has(clueId);
  }

  selectClueAndProceed(clueId: string): void {
    this.selectedClueId = clueId;
    this.activeRoomClueId = clueId;
    this.inspectedClueIds.add(clueId);
    // Gợi ý nghi phạm đầu tiên khi bước sang màn 2
    if (clueId === 'teacup') {
      this.activeRoomSuspectId = 'healer';
    } else if (clueId === 'pollen') {
      this.activeRoomSuspectId = 'consort';
    } else {
      this.activeRoomSuspectId = 'guard';
    }
    this.miniGameStep = 2;
  }

  interrogateSuspectInRoom(suspectId: string): void {
    this.activeRoomSuspectId = suspectId;
  }

  selectSuspectAndConclude(suspectId: string): void {
    this.selectedSuspectId = suspectId;
    this.activeRoomSuspectId = suspectId;
    this.miniGameStep = 3;
  }

  resetMiniGame(): void {
    this.selectedClueId = null;
    this.selectedSuspectId = null;
    this.activeRoomClueId = 'teacup';
    this.activeRoomSuspectId = 'healer';
    this.miniGameStep = 1;
  }

  scrollToMiniGame(): void {
    this.switchHomeSection('simulation', true);
  }

  get deductionVerdict(): { badge: string; rankTitle: string; accuracy: string; analysis: string; twist: string } {
    const clue = this.selectedClueId;
    const suspect = this.selectedSuspectId;
    if (
      (clue === 'teacup' && suspect === 'healer') ||
      (clue === 'pollen' && suspect === 'consort') ||
      (clue === 'letter' && suspect === 'guard')
    ) {
      return {
        badge: 'SUY LUẬN TRÚNG ĐÍCH · BẬC ĐẠI LÝ TỰ KHANH',
        rankTitle: 'Bạn đã bóc tách chính xác mắt xích trực tiếp trong đêm Lệ Chi Viên!',
        accuracy: 'Độ trùng khớp hồ sơ mật: 92%',
        analysis: `Sự kết hợp giữa [${this.selectedClue?.title}] và mâu thuẫn trong lời khai của [${this.selectedSuspect?.name}] đã bẻ gãy hoàn toàn bằng chứng ngoại phạm lúc canh ba.`,
        twist: 'Tuy nhiên, kẻ vừa bị bạn vạch mặt mới chỉ là "tay trong" thực thi. Kẻ chủ mưu thực sự đứng sau giật dây cả 3 nghi phạm vẫn đang ẩn mình trong 60 lá bài cốt truyện của bộ Board Game "ẨN: Mật Án Lệ Chi Viên"!'
      };
    }
    return {
      badge: 'SUY LUẬN TÁO BẠO · THÁM TỬ TIỀM NĂNG',
      rankTitle: 'Bạn đã phát hiện ra mối liên kết ngầm giữa hai đầu mối tưởng chừng rời rạc!',
      accuracy: 'Độ trùng khớp hồ sơ mật: 78%',
      analysis: `Bạn dùng [${this.selectedClue?.title}] để buộc tội [${this.selectedSuspect?.name}]. Hướng điều tra này mở ra nghi vấn cả hai người đã thông đồng che giấu thời điểm tử vong thực sự.`,
      twist: 'Nhưng cẩn thận: Một nghi phạm khác đã cố tình ngụy tạo vật chứng này để đánh lạc hướng bạn! Muốn biết ai mới là kẻ giật dây cuối cùng trên bàn chơi 3-6 người, hãy mở toàn bộ hồ sơ Mật Án Lệ Chi Viên.'
    };
  }

  openCharacterProfile(char: CharacterProfile): void {
    const modelBtn = char.model3d
      ? `<button class="button button--primary button--small" type="button" data-action="open-3d-model" data-model-title="${char.title}" data-model-src="${char.model3d}" data-model-poster="${char.image}">Xem mô hình 3D</button>`
      : '';
    const relatedProducts = this.store
      .getProducts()
      .filter((p) => p.id === 1 || p.category === 'merchandise')
      .slice(0, 3);
    const relatedHtml = relatedProducts.length
      ? `
        <div style="margin-top:1rem;padding-top:0.85rem;border-top:1px solid rgba(213,183,107,0.22);">
          <small style="display:block;color:var(--color-gold-soft);font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.55rem;">Vật phẩm liên quan đến ${char.title}:</small>
          <div style="display:grid;gap:0.45rem;">
            ${relatedProducts
              .map(
                (p) => `
              <a href="/products/${p.id}" data-action="close-info-modal" style="display:flex;align-items:center;justify-content:space-between;gap:0.6rem;padding:0.45rem 0.65rem;border-radius:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(213,183,107,0.28);text-decoration:none;color:#f3ead6;">
                <span style="display:flex;align-items:center;gap:0.55rem;min-width:0;">
                  <img src="${p.images[0]}" alt="${p.name}" style="width:46px !important;height:46px !important;min-height:46px !important;max-height:46px !important;border-radius:6px;object-fit:cover !important;flex-shrink:0;">
                  <strong style="font-size:0.84rem;">${p.name}</strong>
                </span>
                <span style="color:var(--color-gold-soft);font-weight:700;font-size:0.82rem;white-space:nowrap;">${this.store.formatCurrency(p.discountPrice ?? p.price)} &rarr;</span>
              </a>`
              )
              .join('')}
          </div>
        </div>
      `
      : '';
    this.store.openInfoModal({
      title: char.title,
      eyebrow: 'Hồ sơ nhân vật',
      modifier: 'character',
      contentHtml: `
        <div class="character-profile-modal">
          <img src="${char.image}" alt="${char.title}">
          <div>
            <p>${char.story}</p>
            <div class="button-row character-profile-actions">
              <a class="button button--secondary button--small" href="/products?category=merchandise" data-action="close-info-modal">Xem sản phẩm liên quan</a>
              ${modelBtn}
            </div>
            ${relatedHtml}
          </div>
        </div>
      `
    });
  }

  validateNewsletterEmail(showWhenEmpty = false): boolean {
    const val = this.newsletterEmail.trim();
    if (!val && !showWhenEmpty) {
      this.newsletterError = '';
      return true;
    }
    if (!this.store.isValidEmail(val)) {
      this.newsletterError = 'Email không đúng định dạng. Vui lòng nhập lại.';
      return false;
    }
    this.newsletterError = '';
    return true;
  }

  submitNewsletter(): void {
    if (!this.validateNewsletterEmail(true)) {
      this.newsletterMessage = this.newsletterError;
      return;
    }
    this.newsletterSubmitting = true;
    const msg = 'Đã ghi nhận email nhận mật thư. Bản demo chưa tích hợp API gửi email tự động, nên hệ thống chỉ hiển thị thông báo xác nhận.';
    setTimeout(() => {
      this.newsletterEmail = '';
      this.newsletterError = '';
      this.newsletterMessage = msg;
      this.newsletterSubmitting = false;
      this.store.showToast(msg);
    }, 250);
  }
}
