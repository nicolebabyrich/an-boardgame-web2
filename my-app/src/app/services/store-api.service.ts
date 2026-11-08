import { ApplicationRef, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { Category } from '../classes/Category';
import { Product } from '../classes/Product';
import { User } from '../classes/User';
import { Address } from '../classes/Address';
import { CartItem } from '../classes/CartItem';
import { Voucher } from '../classes/Voucher';
import { Order } from '../classes/Order';
import { Review } from '../classes/Review';
import { BlogPost } from '../classes/BlogPost';
import { InventoryTransaction, ReturnRequest } from '../classes/ReturnRequest';

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 1,
    slug: 'an-mat-an-le-chi-vien',
    sku: 'AN-BG-001',
    name: 'ẨN: Mật Án Lệ Chi Viên',
    category: 'boardgame',
    price: 359000,
    discountPrice: 329000,
    stock: 18,
    status: 'ACTIVE',
    featured: true,
    createdAt: '2026-06-28',
    images: ['/img/products/23.png', '/img/products/18.png', '/img/products/10.png', '/img/products/11.png'],
    description: 'Board game trinh thám lịch sử đưa người chơi vào cuộc điều tra quanh biến cố Lệ Chi Viên.',
    historicalPeriod: 'Đại Việt thế kỷ XV, triều Lê sơ',
    gameType: 'Suy luận, ẩn vai, nhập vai',
    playerCount: '3-6 người',
    ageRating: '13+',
    duration: '90-120 phút',
    difficulty: 'Khó',
    components: 'Hộp game, thẻ nhân vật, thẻ vật chứng, mật thư, bản đồ, token và sách hướng dẫn.',
    storySummary: 'Năm 1442, chén ngọc vỡ tan trong đêm lạnh Lệ Chi Viên. Cái chết của bậc quân vương kéo theo những lời khai chồng chéo, mảnh vật chứng bị giấu kín và một bí mật cung đình có thể đổi hướng lịch sử.',
    model3d: '/img/3d/products/hop-boardgame.glb'
  },
  {
    id: 2,
    slug: 'combo-so-khoi',
    sku: 'AN-CB-001',
    name: 'Combo Sơ Khởi',
    category: 'combo',
    price: 429000,
    discountPrice: 389000,
    stock: 10,
    status: 'ACTIVE',
    featured: true,
    createdAt: '2026-06-24',
    images: ['/img/products/20.png', '/img/products/2.png', '/img/products/3.png'],
    description: 'Phiên bản nhập môn gồm board game, bookmark nhân vật và sticker sưu tầm.',
    historicalPeriod: 'Đại Việt thế kỷ XV',
    gameType: 'Combo nhập môn',
    playerCount: '3-6 người',
    ageRating: '13+',
    duration: '90-120 phút',
    difficulty: 'Trung bình',
    components: 'Board game bản tiêu chuẩn, bộ bookmark và sticker.',
    storySummary: 'Bộ khởi đầu dành cho nhóm lần đầu bước vào hồ sơ Lệ Chi Viên.'
  },
  {
    id: 3,
    slug: 'combo-thien-tu',
    sku: 'AN-CB-002',
    name: 'Combo Thiên Tử',
    category: 'combo',
    price: 790000,
    discountPrice: 699000,
    stock: 8,
    status: 'ACTIVE',
    featured: true,
    createdAt: '2026-06-20',
    images: ['/img/products/21.png', '/img/products/15.png', '/img/products/16.png'],
    description: 'Bộ điều tra nâng cao với phụ kiện kim loại và xúc xắc màu hổ phách.',
    historicalPeriod: 'Đại Việt thế kỷ XV',
    gameType: 'Combo nâng cao',
    playerCount: '3-6 người',
    ageRating: '13+',
    duration: '90-150 phút',
    difficulty: 'Khó',
    components: 'Board game, poster, đồng xu, xúc xắc và bộ sticker.',
    storySummary: 'Tập hợp những vật chứng hữu hình cho một phiên điều tra giàu nhập vai.'
  },
  {
    id: 4,
    slug: 'combo-hoang-kim',
    sku: 'AN-CB-003',
    name: 'Combo Hoàng Kim',
    category: 'combo',
    price: 1299000,
    discountPrice: 1099000,
    stock: 4,
    status: 'ACTIVE',
    featured: true,
    createdAt: '2026-06-18',
    images: ['/img/products/22.png', '/img/products/5.png', '/img/products/6.png'],
    description: 'Phiên bản sưu tầm đầy đủ nhất dành cho người yêu lịch sử và board game.',
    historicalPeriod: 'Đại Việt thế kỷ XV',
    gameType: 'Combo sưu tầm',
    playerCount: '3-6 người',
    ageRating: '13+',
    duration: '90-150 phút',
    difficulty: 'Chuyên gia',
    components: 'Board game, artbook, cốc, áo, túi, standee, poster, coin, dice và sticker.',
    storySummary: 'Một rương chứng cứ hoàn chỉnh, kết hợp trải nghiệm chơi và giá trị trưng bày.',
    model3d: '/img/3d/products/combo-hoang-kim.glb'
  },
  {
    id: 5,
    slug: 'tui-tote-an',
    sku: 'AN-MD-001',
    name: 'Túi Tote Vải Canvas ẨN',
    category: 'merchandise',
    price: 199000,
    discountPrice: null,
    stock: 21,
    status: 'ACTIVE',
    featured: false,
    createdAt: '2026-06-15',
    images: ['/img/products/1.png'],
    description: 'Túi canvas dày với minh họa dàn nhân vật trong hồ sơ Lệ Chi Viên.',
    historicalPeriod: 'Cảm hứng Đại Việt',
    gameType: 'Vật phẩm sưu tầm',
    playerCount: 'Không áp dụng',
    ageRating: 'Mọi độ tuổi',
    duration: 'Không áp dụng',
    difficulty: 'Không áp dụng',
    components: 'Một túi tote canvas có quai đeo.',
    storySummary: 'Mang theo hồ sơ vụ án trong mọi hành trình thường nhật.'
  },
  {
    id: 6,
    slug: 'poster-le-chi-vien',
    sku: 'AN-MD-002',
    name: 'Poster Án Lệ Chi Viên A3',
    category: 'merchandise',
    price: 99000,
    discountPrice: null,
    stock: 0,
    status: 'OUT_OF_STOCK',
    featured: false,
    createdAt: '2026-06-13',
    images: ['/img/products/4.png'],
    description: 'Poster A3 tái hiện chiếc hộp bí ẩn và những nhân vật trung tâm.',
    historicalPeriod: 'Đại Việt thế kỷ XV',
    gameType: 'Tranh sưu tầm',
    playerCount: 'Không áp dụng',
    ageRating: 'Mọi độ tuổi',
    duration: 'Không áp dụng',
    difficulty: 'Không áp dụng',
    components: 'Một poster khổ A3.',
    storySummary: 'Một mảnh hình ảnh được trích từ kho lưu trữ của vụ án.'
  },
  {
    id: 7,
    slug: 'ao-thun-oversize-an',
    sku: 'AN-MD-003',
    name: 'Áo Thun Oversize ẨN',
    category: 'merchandise',
    price: 329000,
    discountPrice: 299000,
    stock: 14,
    status: 'ACTIVE',
    featured: false,
    createdAt: '2026-06-10',
    images: ['/img/products/5.png'],
    description: 'Áo cotton oversize in logo trước ngực và dàn nhân vật sau lưng.',
    historicalPeriod: 'Cảm hứng Đại Việt',
    gameType: 'Thời trang sưu tầm',
    playerCount: 'Không áp dụng',
    ageRating: 'Mọi độ tuổi',
    duration: 'Không áp dụng',
    difficulty: 'Không áp dụng',
    components: 'Một áo thun oversize.',
    storySummary: 'Dấu hiệu nhận biết kín đáo của cộng đồng điều tra viên ẨN Store.'
  },
  {
    id: 8,
    slug: 'ly-su-an',
    sku: 'AN-MD-004',
    name: 'Ly Sứ ẨN',
    category: 'merchandise',
    price: 189000,
    discountPrice: null,
    stock: 16,
    status: 'ACTIVE',
    featured: false,
    createdAt: '2026-06-08',
    images: ['/img/products/6.png'],
    description: 'Ly sứ trắng in minh họa nhân vật, phù hợp góc chơi và bàn làm việc.',
    historicalPeriod: 'Cảm hứng Đại Việt',
    gameType: 'Vật phẩm sưu tầm',
    playerCount: 'Không áp dụng',
    ageRating: 'Mọi độ tuổi',
    duration: 'Không áp dụng',
    difficulty: 'Không áp dụng',
    components: 'Một ly sứ dung tích 350 ml.',
    storySummary: 'Một vật dụng bình dị mang theo không khí của phòng điều tra.',
    model3d: '/img/3d/products/ly-su.glb',
    demoVideo: '/img/video/products/ly-su-demo.mp4'
  },
  {
    id: 9,
    slug: 'bo-con-dau-an',
    sku: 'AN-PK-001',
    name: 'Bộ Con Dấu ẨN',
    category: 'accessory',
    price: 169000,
    discountPrice: null,
    stock: 9,
    status: 'ACTIVE',
    featured: false,
    createdAt: '2026-06-06',
    images: ['/img/products/7.png'],
    description: 'Con dấu gỗ và dấu sáp mô phỏng niêm phong hồ sơ mật.',
    historicalPeriod: 'Cảm hứng văn thư cổ',
    gameType: 'Phụ kiện nhập vai',
    playerCount: '1-8 người',
    ageRating: '13+',
    duration: 'Không áp dụng',
    difficulty: 'Dễ',
    components: 'Tay cầm gỗ, mặt dấu và sáp niêm phong.',
    storySummary: 'Niêm phong lời khai trước khi hồ sơ được chuyển vào kho bí mật.'
  },
  {
    id: 10,
    slug: 'so-tay-dieu-tra',
    sku: 'AN-PK-002',
    name: 'Sổ Tay Điều Tra',
    category: 'accessory',
    price: 159000,
    discountPrice: null,
    stock: 25,
    status: 'ACTIVE',
    featured: false,
    createdAt: '2026-06-04',
    images: ['/img/products/8.png', '/img/products/17.png'],
    description: 'Sổ giấy ngà dùng để ghi lời khai, nghi vấn và sơ đồ liên kết.',
    historicalPeriod: 'Cảm hứng Đại Việt',
    gameType: 'Phụ kiện ghi chép',
    playerCount: '1 người',
    ageRating: '12+',
    duration: 'Không áp dụng',
    difficulty: 'Dễ',
    components: 'Một sổ 160 trang và dây đánh dấu.',
    storySummary: 'Mọi giả thuyết tốt đều bắt đầu từ một dòng ghi chú đúng lúc.'
  },
  {
    id: 11,
    slug: 'standee-acrylic-nhan-vat',
    sku: 'AN-MD-005',
    name: 'Standee Acrylic Nhân Vật',
    category: 'merchandise',
    price: 149000,
    discountPrice: null,
    stock: 11,
    status: 'ACTIVE',
    featured: false,
    createdAt: '2026-06-02',
    images: ['/img/products/9.png'],
    description: 'Standee acrylic trưng bày nhóm nhân vật trung tâm của vụ án.',
    historicalPeriod: 'Đại Việt thế kỷ XV',
    gameType: 'Vật phẩm trưng bày',
    playerCount: 'Không áp dụng',
    ageRating: 'Mọi độ tuổi',
    duration: 'Không áp dụng',
    difficulty: 'Không áp dụng',
    components: 'Một tấm acrylic và chân đế.',
    storySummary: 'Những nhân chứng luôn hiện diện, nhưng không phải ai cũng nói thật.'
  },
  {
    id: 13,
    slug: 'ban-mo-rong-dem-trang-le-chi',
    sku: 'AN-BG-002',
    name: 'Bản Mở Rộng: Đêm Trăng Lệ Chi',
    category: 'boardgame',
    price: 249000,
    discountPrice: 219000,
    stock: 15,
    status: 'ACTIVE',
    featured: false,
    createdAt: '2026-06-29',
    images: ['/img/products/12.png', '/img/products/13.png'],
    description: 'Bản mở rộng kịch bản mới với 4 nhân vật ẩn và 12 mật thư đêm trăng.',
    historicalPeriod: 'Đại Việt thế kỷ XV',
    gameType: 'Bản mở rộng suy luận',
    playerCount: '3-7 người',
    ageRating: '13+',
    duration: '60-90 phút',
    difficulty: 'Khó',
    components: '4 thẻ nhân vật mới, 12 mật thư, 1 bản đồ phụ Lệ Chi Viên.',
    storySummary: 'Khi tiếng trống canh ba vang lên, một nhân chứng bí mật xuất hiện bên bờ sông Thiên Đức.'
  },
  {
    id: 14,
    slug: 'bo-dong-xu-co-dai-viet',
    sku: 'AN-PK-004',
    name: 'Bộ Đồng Xu Cổ Đại Việt (Kim Loại)',
    category: 'accessory',
    price: 179000,
    discountPrice: 149000,
    stock: 20,
    status: 'ACTIVE',
    featured: false,
    createdAt: '2026-06-27',
    images: ['/img/products/15.png'],
    description: 'Bộ 24 đồng xu hợp kim đúc nổi hoa văn cổ phong dùng làm token uy tín.',
    historicalPeriod: 'Triều Lê sơ',
    gameType: 'Phụ kiện nâng cấp',
    playerCount: '3-6 người',
    ageRating: '12+',
    duration: 'Không áp dụng',
    difficulty: 'Dễ',
    components: '24 đồng xu kim loại và túi nhung đựng xu.',
    storySummary: 'Mỗi đồng xu là một lời thề danh dự giữa các quan ngự sử trong cuộc điều tra.'
  },
  {
    id: 15,
    slug: 'artbook-ho-so-mat-le-chi',
    sku: 'AN-MD-006',
    name: 'Artbook: Hồ Sơ Mật Lệ Chi (Bìa Cứng)',
    category: 'merchandise',
    price: 289000,
    discountPrice: 259000,
    stock: 12,
    status: 'ACTIVE',
    featured: false,
    createdAt: '2026-06-25',
    images: ['/img/products/14.png', '/img/products/16.png'],
    description: 'Sách mỹ thuật 120 trang in màu toàn bộ thiết kế nhân vật, bối cảnh và tư liệu lịch sử.',
    historicalPeriod: 'Đại Việt thế kỷ XV',
    gameType: 'Ấn phẩm sưu tầm',
    playerCount: 'Không áp dụng',
    ageRating: 'Mọi độ tuổi',
    duration: 'Không áp dụng',
    difficulty: 'Không áp dụng',
    components: 'Sách bìa cứng khâu gáy 120 trang, tặng kèm 2 postcard.',
    storySummary: 'Hành trình phục dựng trang phục, kiến trúc và thần thái của từng nhân vật lịch sử.'
  },
  {
    id: 16,
    slug: 'xuc-xac-ho-phach-ngoc-an',
    sku: 'AN-PK-005',
    name: 'Bộ Xúc Xắc Hổ Phách Ngọc Ấn',
    category: 'accessory',
    price: 129000,
    discountPrice: null,
    stock: 30,
    status: 'ACTIVE',
    featured: false,
    createdAt: '2026-06-22',
    images: ['/img/products/16.png'],
    description: 'Bộ 6 viên xúc xắc nhựa resin trong suốt ánh hổ phách khắc ký hiệu cổ.',
    historicalPeriod: 'Cảm hứng Đại Việt',
    gameType: 'Phụ kiện bàn chơi',
    playerCount: '1-8 người',
    ageRating: '12+',
    duration: 'Không áp dụng',
    difficulty: 'Dễ',
    components: '6 viên xúc xắc 16mm và hộp thiếc nhỏ.',
    storySummary: 'Những bước ngoặt bất ngờ trên bàn điều tra được định đoạt qua từng lần gieo xúc xắc.'
  }
];

const INITIAL_VOUCHERS: Voucher[] = [
  { code: 'AN10', name: 'Mật mã nhập môn', type: 'percentage', value: 10, maxDiscount: 150000, minOrder: 500000, startAt: '2026-06-01T00:00:00+07:00', endAt: '2026-12-31T23:59:59+07:00', usageLimit: 200, usedCount: 18, usedByUserIds: [], status: 'ACTIVE' },
  { code: 'LECHI150', name: 'Hồ sơ Lệ Chi', type: 'fixed', value: 150000, maxDiscount: null, minOrder: 1000000, startAt: '2026-06-01T00:00:00+07:00', endAt: '2026-12-31T23:59:59+07:00', usageLimit: 100, usedCount: 24, usedByUserIds: [], status: 'ACTIVE' },
  { code: 'FREESHIP', name: 'Mật lệnh giao nhận', type: 'shipping', value: 30000, maxDiscount: 30000, minOrder: 300000, startAt: '2026-06-01T00:00:00+07:00', endAt: '2026-12-31T23:59:59+07:00', usageLimit: 150, usedCount: 12, usedByUserIds: [], status: 'ACTIVE' },
  { code: 'THAMTU50', name: 'Ưu đãi điều tra viên', type: 'fixed', value: 50000, maxDiscount: null, minOrder: 400000, startAt: '2026-07-01T00:00:00+07:00', endAt: '2026-12-31T23:59:59+07:00', usageLimit: 100, usedCount: 5, usedByUserIds: [], status: 'ACTIVE' }
];

const INITIAL_BLOGS: BlogPost[] = [
  { id: 1, title: 'Lệ Chi Viên: khi lịch sử trở thành một vụ án', excerpt: 'Từ một biến cố lịch sử, đội ngũ xây dựng cơ chế suy luận nhiều lớp như thế nào?', image: '/img/products/4.png', date: '24.06.2026', status: 'PUBLISHED', source: 'ADMIN' },
  { id: 2, title: 'Năm dấu hiệu của một lời khai chưa hoàn chỉnh', excerpt: 'Quan sát, đối chiếu và giữ một chút hoài nghi trước mọi nhân chứng.', image: '/img/products/10.png', date: '18.06.2026', status: 'PUBLISHED', source: 'ADMIN' },
  { id: 3, title: 'Thiết kế một bàn chơi đậm chất hồ sơ cổ', excerpt: 'Ánh sáng, nhịp chơi và những vật phẩm nhỏ làm nên trải nghiệm nhập vai.', image: '/img/products/12.png', date: '09.06.2026', status: 'DRAFT', source: 'ADMIN' }
];

const INITIAL_ADVISOR_TICKETS = [
  {
    id: 1,
    ticketCode: 'TV-20260629-01',
    customerName: 'Hoàng Lan',
    customerPhone: '0704477397',
    emotionLevel: 'RED',
    emotionColor: '#ef4444',
    emotionLabel: 'Đỏ - Khách hàng đang bức xúc cao',
    originalMessage: 'dmm giao hàng kiểu gì mà hộp móp góc, nhắn mãi không ai trả lời, quá tệ!',
    softenedMessage: 'Tôi đang rất bức xúc vì hộp sản phẩm bị móp góc khi giao nhận và cần Tư vấn viên kiểm tra, đổi mới gấp giúp tôi.',
    status: 'PENDING',
    advisorReply: '',
    createdAt: '29/06/2026 21:15',
    messages: [
      { role: 'user', text: 'dmm giao hàng kiểu gì mà hộp móp góc, nhắn mãi không ai trả lời, quá tệ!', at: '21:15' },
      { role: 'bot', text: 'Thư Đồng thành thật xin lỗi bạn! Hệ thống đã chuyển ngữ lịch sự và báo động mức ĐỎ cho Tư vấn viên hỗ trợ khẩn cấp.', at: '21:15' }
    ]
  },
  {
    id: 2,
    ticketCode: 'TV-20260629-02',
    customerName: 'Phạm Gia Huy',
    customerPhone: '0901000003',
    emotionLevel: 'ORANGE',
    emotionColor: '#f59e0b',
    emotionLabel: 'Cam - Khách hàng sốt ruột / Khiếu nại',
    originalMessage: 'Đơn hàng AN202606260003 sao lâu quá chưa giao tới nữa shop ơi, chờ mãi!',
    softenedMessage: 'Nhờ Tư vấn viên kiểm tra giúp tôi hành trình đơn hàng AN202606260003 vì thời gian giao hơi chậm so với dự kiến.',
    status: 'PENDING',
    advisorReply: '',
    createdAt: '29/06/2026 19:40',
    messages: [
      { role: 'user', text: 'Đơn hàng AN202606260003 sao lâu quá chưa giao tới nữa shop ơi, chờ mãi!', at: '19:40' },
      { role: 'bot', text: 'Thư Đồng hiểu bạn đang sốt ruột. Đã chuyển thông tin sang bộ phận Tư vấn viên kiểm tra bưu cục ngay ạ.', at: '19:40' }
    ]
  },
  {
    id: 3,
    ticketCode: 'TV-20260628-03',
    customerName: 'Lê Ngọc Mai',
    customerPhone: '0901000002',
    emotionLevel: 'GREEN',
    emotionColor: '#22c55e',
    emotionLabel: 'Xanh - Khách hàng bình tĩnh',
    originalMessage: 'Shop tư vấn giúp mình gói Combo Thiên Tử gói quà sinh nhật có kèm thiệp cổ phong không ạ?',
    softenedMessage: 'Khách hàng nhờ tư vấn gói quà sinh nhật Combo Thiên Tử kèm thiệp cổ phong.',
    status: 'RESOLVED',
    advisorReply: 'Chào bạn Ngọc Mai, ẨN Store có hỗ trợ gói giấy dó và tặng kèm thiệp dấu sáp miễn phí cho Combo Thiên Tử nhé ạ!',
    createdAt: '28/06/2026 16:20',
    messages: [
      { role: 'user', text: 'Shop tư vấn giúp mình gói Combo Thiên Tử gói quà sinh nhật có kèm thiệp cổ phong không ạ?', at: '16:20' },
      { role: 'advisor', text: 'Chào bạn Ngọc Mai, ẨN Store có hỗ trợ gói giấy dó và tặng kèm thiệp dấu sáp miễn phí cho Combo Thiên Tử nhé ạ!', at: '16:24' }
    ]
  }
];

export interface ToastNotice {
  id: number;
  message: string;
  error?: boolean;
  actionLabel?: string;
  actionRoute?: string;
}

export interface InfoModalConfig {
  title: string;
  titleHtml?: string;
  eyebrow: string;
  contentHtml: string;
  modifier?: string;
}

const SESSION_STORAGE_KEY = 'anstore.angular.session.v1';

@Injectable({
  providedIn: 'root'
})
export class StoreApiService {
  readonly categories$ = new BehaviorSubject<Category[]>([
    { id: 'all', name: 'Tất cả sản phẩm', description: 'Toàn bộ hồ sơ và vật phẩm đang được lưu trữ.', hidden: false },
    { id: 'boardgame', name: 'BoardGame', description: 'Những vụ án lịch sử được kể bằng suy luận và nhập vai.', hidden: false },
    { id: 'combo', name: 'Combo', description: 'Bộ sưu tập trọn vẹn cho từng cấp bậc điều tra viên.', hidden: false },
    { id: 'merchandise', name: 'Merchandise', description: 'Vật phẩm mang dấu ấn của thế giới ẨN.', hidden: false },
    { id: 'accessory', name: 'Phụ kiện', description: 'Công cụ hỗ trợ mỗi cuộc phá án trên bàn chơi.', hidden: false }
  ]);
  readonly products$ = new BehaviorSubject<Product[]>(INITIAL_PRODUCTS);
  readonly vouchers$ = new BehaviorSubject<Voucher[]>(INITIAL_VOUCHERS);
  readonly blogs$ = new BehaviorSubject<BlogPost[]>(INITIAL_BLOGS);
  readonly currentUser$ = new BehaviorSubject<User | null>(null);
  readonly adminLoggedIn$ = new BehaviorSubject<boolean>(false);
  readonly addresses$ = new BehaviorSubject<Address[]>([]);
  readonly cartItems$ = new BehaviorSubject<CartItem[]>([]);
  readonly orders$ = new BehaviorSubject<Order[]>([]);
  readonly reviews$ = new BehaviorSubject<Review[]>([]);
  readonly returnRequests$ = new BehaviorSubject<ReturnRequest[]>([]);
  readonly inventoryTransactions$ = new BehaviorSubject<InventoryTransaction[]>([]);
  readonly userBlogSubmissions$ = new BehaviorSubject<any[]>([]);
  readonly invoices$ = new BehaviorSubject<any[]>([]);
  readonly advisorTickets$ = new BehaviorSubject<any[]>(INITIAL_ADVISOR_TICKETS);
  readonly toasts$ = new BehaviorSubject<ToastNotice[]>([]);
  readonly infoModal$ = new BehaviorSubject<InfoModalConfig | null>(null);

  constructor(
    private http: HttpClient,
    private appRef: ApplicationRef
  ) {
    this.restoreLocalSession();
    this.syncStateFromBackend();
  }

  private triggerTick(): void {
    setTimeout(() => {
      try {
        this.appRef.tick();
      } catch {}
    }, 0);
  }

  private sanitizeHoangLan(text: any): string {
    const val = String(text || '');
    return val.replace(/Nguyễn\s*Thị\s*Kim\s*Kiều\s*Oanh|Kiều\s*Oanh/gi, 'Hoàng Lan');
  }

  private restoreLocalSession(): void {
    try {
      const raw = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || '{}');
      if (raw.currentUser) {
        raw.currentUser.fullName = this.sanitizeHoangLan(raw.currentUser.fullName);
        this.currentUser$.next(raw.currentUser);
      }
      if (raw.adminLoggedIn) this.adminLoggedIn$.next(Boolean(raw.adminLoggedIn));
      if (Array.isArray(raw.cartItems)) this.cartItems$.next(raw.cartItems);
    } catch {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }

  private persistLocalSession(): void {
    const payload = {
      currentUser: this.currentUser$.value,
      adminLoggedIn: this.adminLoggedIn$.value,
      cartItems: this.cartItems$.value.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        selected: item.selected,
        attribute: item.attribute || 'Bản Tiêu Chuẩn',
        reservedUntil: item.reservedUntil || (Date.now() + 15 * 60 * 1000)
      }))
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
  }

  async syncStateFromBackend(): Promise<void> {
    try {
      const data = await firstValueFrom(this.http.get<any>('/api/state'));
      if (data.categories) this.categories$.next(data.categories);
      if (data.products) this.products$.next(data.products);
      if (data.vouchers) this.vouchers$.next(data.vouchers);
      if (data.blogs) this.blogs$.next(data.blogs);
      if (Array.isArray(data.addresses)) {
        this.addresses$.next(
          data.addresses.map((a: Address) => ({
            ...a,
            receiverName: this.sanitizeHoangLan(a.receiverName)
          }))
        );
      }
      if (Array.isArray(data.orders)) {
        this.orders$.next(
          data.orders.map((o: Order) => ({
            ...o,
            address: o.address
              ? { ...o.address, receiverName: this.sanitizeHoangLan(o.address.receiverName) }
              : o.address
          }))
        );
      }
      if (data.reviews) this.reviews$.next(data.reviews);
      if (data.returnRequests) this.returnRequests$.next(data.returnRequests);
      if (data.inventoryTransactions) this.inventoryTransactions$.next(data.inventoryTransactions);
      if (Array.isArray(data.userBlogSubmissions)) {
        this.userBlogSubmissions$.next(
          data.userBlogSubmissions.map((p: any) => ({
            ...p,
            authorName: this.sanitizeHoangLan(p.authorName)
          }))
        );
      }
      if (data.invoices) this.invoices$.next(data.invoices);
      if (Array.isArray(data.advisorTickets) && data.advisorTickets.length) {
        this.advisorTickets$.next(
          data.advisorTickets.map((t: any) => ({
            ...t,
            customerName: this.sanitizeHoangLan(t.customerName)
          }))
        );
      }

      const curUser = this.currentUser$.value;
      if (curUser && Array.isArray(data.users)) {
        const refreshed = data.users.find((u: User) => u.id === curUser.id);
        if (refreshed) {
          refreshed.fullName = this.sanitizeHoangLan(refreshed.fullName);
          this.currentUser$.next(refreshed);
          this.persistLocalSession();
        }
      }
      this.triggerTick();
    } catch (err) {
      console.error('Không thể đồng bộ dữ liệu từ server:', err);
      this.triggerTick();
    }
  }

  // ==================== FORMAT & VALIDATION HELPERS ====================
  formatCurrency(value: number | null | undefined): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  }

  formatDate(value: string | null | undefined): string {
    const raw = String(value || '').trim();
    if (!raw) return '-';
    if (/^\d{1,2}[./-]\d{1,2}[./-]\d{4}$/.test(raw)) {
      const [day, month, year] = raw.split(/[./-]/).map((part) => part.padStart(2, '0'));
      return `${day}/${month}/${year}`;
    }
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(raw)) {
      const [year, month, day] = raw.split('-');
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw.replace(/\./g, '/');
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      ACTIVE: 'Đang bán',
      OUT_OF_STOCK: 'Hết hàng',
      HIDDEN: 'Ẩn',
      PENDING: 'Chờ xác nhận',
      CONFIRMED: 'Đã xác nhận',
      SHIPPING: 'Đang giao',
      DELIVERED: 'Đã giao',
      CANCELLED: 'Đã hủy',
      APPROVED: 'Đã duyệt',
      REJECTED: 'Từ chối',
      VISIBLE: 'Đang hiển thị',
      DRAFT: 'Bản nháp',
      PUBLISHED: 'Đã xuất bản',
      SUCCESS: 'Thành công',
      REFUNDED: 'Đã hoàn tiền'
    };
    return labels[status] || status;
  }

  statusBadgeModifier(status: string): string {
    if (status === 'OUT_OF_STOCK' || status === 'CANCELLED' || status === 'REJECTED') {
      return 'status-badge--danger';
    }
    if (status === 'HIDDEN' || status === 'PENDING') {
      return 'status-badge--warning';
    }
    return '';
  }

  maxBirthDateForAge(minAge = 13): string {
    const date = new Date();
    date.setFullYear(date.getFullYear() - minAge);
    return date.toISOString().slice(0, 10);
  }

  normalizeEmail(email: string): string {
    return String(email || '').trim().toLowerCase();
  }

  normalizePhone(phone: string): string {
    let value = String(phone || '').trim().replace(/[^0-9+]/g, '');
    if (value.startsWith('+84')) value = '0' + value.slice(3);
    else if (value.startsWith('84') && value.length === 11) value = '0' + value.slice(2);
    return value.replace(/\D/g, '');
  }

  normalizeName(name: string): string {
    return String(name || '').trim().replace(/\s+/g, ' ');
  }

  isValidEmail(email: string): boolean {
    const value = this.normalizeEmail(email);
    if (!value || value.length > 254 || value.includes('..')) return false;
    const pattern = /^[a-z0-9._+-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
    if (!pattern.test(value)) return false;
    const [localPart, domain] = value.split('@');
    if (!localPart || localPart.length > 64 || localPart.startsWith('.') || localPart.endsWith('.')) return false;
    if (!domain || domain.includes('..')) return false;
    if (domain.startsWith('gmail.')) return ['gmail.com', 'gmail.com.vn'].includes(domain);
    const tld = domain.split('.').pop() || '';
    return /^[a-z]{2,6}$/i.test(tld);
  }

  isValidPhone(phone: string): boolean {
    const value = String(phone || '').trim();
    if (!/^\d{10}$/.test(value)) return false;
    return /^0[35789][0-9]{8}$/.test(value) && !/^(\d)\1{9}$/.test(value);
  }

  isValidName(name: string): boolean {
    const value = this.normalizeName(name);
    return value.length >= 2
      && value.length <= 100
      && /^[\p{L}\s.'-]+$/u.test(value);
  }

  isValidDateOfBirth(value: string, minAge = 13): boolean {
    if (!value) return true;
    const date = new Date(value + 'T00:00:00');
    const latestAllowed = new Date(this.maxBirthDateForAge(minAge) + 'T23:59:59');
    return !Number.isNaN(date.getTime()) && date <= latestAllowed && date.getFullYear() >= 1900;
  }

  // ==================== TOAST & MODAL ====================
  showToast(message: string, error = false, actionLabel?: string, actionRoute?: string): void {
    const id = Date.now() + Math.random();
    const next: ToastNotice = { id, message, error, actionLabel, actionRoute };
    this.toasts$.next([...this.toasts$.value, next]);
    this.triggerTick();
    window.setTimeout(() => {
      this.toasts$.next(this.toasts$.value.filter((t) => t.id !== id));
      this.triggerTick();
    }, 5200);
  }

  openInfoModal(config: InfoModalConfig): void {
    this.infoModal$.next(config);
  }

  closeInfoModal(): void {
    this.infoModal$.next(null);
  }

  ensureModelViewerLoaded(): Promise<boolean> {
    if (typeof customElements !== 'undefined' && customElements.get('model-viewer')) {
      return Promise.resolve(true);
    }
    const existing = document.querySelector('script[data-model-viewer-loader]') as HTMLScriptElement | null;
    if (existing) {
      return new Promise((resolve) => {
        existing.addEventListener('load', () => resolve(true), { once: true });
        existing.addEventListener('error', () => resolve(false), { once: true });
      });
    }
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
    script.dataset['modelViewerLoader'] = 'true';
    document.head.append(script);
    return new Promise((resolve) => {
      script.addEventListener('load', () => resolve(true), { once: true });
      script.addEventListener('error', () => resolve(false), { once: true });
    });
  }

  open3DModelModal(title: string, source: string, poster = ''): void {
    this.ensureModelViewerLoaded();
    const safePoster = poster ? ` poster="${poster}"` : '';
    this.openInfoModal({
      title: title || 'Mô hình 3D',
      eyebrow: 'Trải nghiệm 360°',
      modifier: 'model3d',
      contentHtml: `
        <div class="model-viewer-shell">
          <model-viewer src="${source}"${safePoster} camera-controls auto-rotate ar shadow-intensity="0.85" exposure="1" alt="${title}">
            <div class="model-viewer-fallback" slot="poster">
              <p>Đang mở mô hình 3D...</p>
            </div>
          </model-viewer>
          <p class="muted">Kéo để xoay mô hình, cuộn để phóng to/thu nhỏ. Nếu mô hình chưa hiện, hãy kiểm tra kết nối Internet để tải trình xem 3D.</p>
        </div>
      `
    });
  }

  openPolicyModal(type: 'privacy' | 'shipping' | 'return'): void {
    if (type === 'privacy') {
      this.openInfoModal({
        title: 'Chính sách bảo mật',
        titleHtml: '<span class="policy-title-line">Chính sách</span><span class="policy-title-line">bảo mật</span>',
        eyebrow: 'Cam kết bảo mật',
        modifier: 'policy',
        contentHtml: `<p>Chúng tôi cam kết bảo vệ quyền riêng tư của bạn khi sử dụng website ẨN Store.</p><ol class="policy-list"><li><strong>Thông tin thu thập:</strong> họ tên, email, số điện thoại, địa chỉ giao hàng và dữ liệu liên hệ khi bạn đăng ký tài khoản, nhận bản tin hoặc gửi biểu mẫu.</li><li><strong>Sử dụng thông tin:</strong> phục vụ đặt hàng, giao nhận, chăm sóc khách hàng và cải thiện trải nghiệm website.</li><li><strong>Bảo mật:</strong> áp dụng biện pháp kỹ thuật và tổ chức hợp lý để hạn chế truy cập trái phép, mất mát hoặc tiết lộ dữ liệu.</li><li><strong>Cookies:</strong> được dùng để ghi nhớ trạng thái sử dụng và tối ưu trải nghiệm.</li><li><strong>Quyền người dùng:</strong> bạn có thể yêu cầu truy cập, chỉnh sửa hoặc xóa thông tin cá nhân được lưu trữ.</li><li><strong>Liên hệ:</strong> matan@anstore.vn.</li></ol>`
      });
    } else if (type === 'shipping') {
      this.openInfoModal({
        title: 'Chính sách giao nhận',
        titleHtml: '<span class="policy-title-line">Chính sách</span><span class="policy-title-line">giao nhận</span>',
        eyebrow: 'Giao nhận',
        modifier: 'policy',
        contentHtml: `<ol class="policy-list policy-list--long"><li><strong>Đối tượng áp dụng chính sách:</strong> áp dụng cho tất cả khách hàng mua sản phẩm qua website thương mại điện tử anstore.vn.</li><li><strong>Phạm vi vận chuyển:</strong> ANstore thực hiện yêu cầu vận chuyển trên phạm vi toàn quốc.</li><li><strong>Hình thức vận chuyển:</strong> ANstore giao hàng tận nơi và hợp tác với các công ty vận chuyển uy tín để đưa hàng hóa đến tay khách hàng.</li><li><strong>Thời gian giao hàng:</strong> được tính từ lúc đơn hàng đặt thành công. Nếu đơn hàng thành công ngoài giờ làm việc, thời gian được tính từ giờ làm việc đầu tiên của ngày làm việc tiếp theo.</li><li><strong>Quy trình xử lý đơn hàng:</strong> sau khi đặt hàng thành công, ANstore gửi xác nhận đơn hàng qua email.</li><li><strong>Thời gian và phí vận chuyển:</strong> Hồ Chí Minh miễn phí vận chuyển, giao trong 1-3 ngày làm việc. Liên tỉnh phí vận chuyển 30.000 VNĐ, giao trong 3-4 ngày làm việc. Đơn hàng trên 500.000 VNĐ được miễn phí vận chuyển. Giao hàng cấp tốc chỉ áp dụng TP. HCM với cước phí 50.000 VNĐ.</li><li><strong>Lưu ý vận chuyển:</strong> thời gian nhận hàng có thể kéo dài hơn dự kiến do lũ lụt, hỏa hoạn, tai nạn, thời tiết, giao thông hoặc điều kiện khách quan ngoài kiểm soát. Trong các trường hợp này, ANstore sẽ nỗ lực khắc phục và ưu tiên quyền lợi khách hàng.</li><li><strong>Nhận hàng - kiểm hàng:</strong> quý khách cần đối soát sản phẩm còn nguyên đai, nguyên kiện, còn niêm phong, chưa có dấu hiệu bóc mở và đầy đủ chứng từ của anstore.vn. Nếu phát hiện bất thường, liên hệ Hot Line 090-XXX-XXXX hoặc email matan@anstore.vn để được hướng dẫn.</li></ol>`
      });
    } else {
      this.openInfoModal({
        title: 'Chính sách đổi trả',
        titleHtml: '<span class="policy-title-line">Chính sách</span><span class="policy-title-line policy-title-line--pair">đổi trả</span>',
        eyebrow: 'Bảo hành và đổi trả',
        modifier: 'policy',
        contentHtml: `<ol class="policy-list policy-list--long"><li><strong>Chính sách bảo hành:</strong> sản phẩm còn thời gian bảo hành theo phiếu bảo hành hoặc hóa đơn mua hàng của ANstore và được xác định là lỗi nhà sản xuất. Việc xác định lỗi được thực hiện bởi website anstore.vn.</li><li><strong>Gửi sản phẩm bảo hành:</strong> khách hàng có thể đem hoặc gửi sản phẩm đến kho hàng ANstore theo địa chỉ trên phiếu bảo hành hoặc hóa đơn. Chi phí vận chuyển do khách hàng chi trả.</li><li><strong>Kiểm tra bảo hành:</strong> ANstore kiểm tra tổng quan sản phẩm. Nếu lỗi do khách hàng như bể, nước vào sản phẩm hoặc không phải lỗi kỹ thuật từ nhà sản xuất, ANstore sẽ tư vấn và có quyền từ chối tiếp nhận bảo hành. Nếu khách vẫn cần hỗ trợ sửa chữa, ANstore tư vấn theo quy trình sửa chữa tính phí.</li><li><strong>Thời gian bảo hành:</strong> khu vực HN/HCM: 7 ngày làm việc kể cả thời gian vận chuyển. Khu vực tỉnh: 17 ngày làm việc kể cả thời gian vận chuyển.</li><li><strong>Điều kiện đổi/trả:</strong> sản phẩm lỗi kỹ thuật do nhà sản xuất hoặc thiếu chi tiết nhưng bên ngoài không trầy xước, bể, vỡ, móp méo; hoặc khách nhận không đúng sản phẩm đã đặt và bao bì còn nguyên vẹn.</li><li><strong>Thời hạn đổi/trả:</strong> trong vòng 03 ngày kể từ ngày khách hàng nhận hàng, căn cứ thời gian ký nhận trên vận đơn. Sản phẩm đổi trả phải còn hóa đơn bán hàng do ANstore gửi kèm.</li><li><strong>Chính sách đổi hàng:</strong> khách hàng đem sản phẩm đến đổi trực tiếp tại kho hàng ANstore và chỉ được đổi đúng mã sản phẩm đã mua.</li><li><strong>Hoàn tiền:</strong> với đơn COD/Thẻ, ANstore hoàn tiền bằng chuyển khoản trong vòng 7 ngày làm việc kể từ ngày nhận được hàng hóa khách gửi lại.</li><li><strong>Cách gửi trả hàng:</strong> bước 1, khách hàng chụp hình hoặc quay clip sản phẩm lỗi/hư hỏng và gửi yêu cầu qua kênh liên hệ. Bước 2, khách nội thành HN/HCM mang hàng trực tiếp đến kho ANstore; khách ngoại thành HN/HCM gửi trả hàng về địa chỉ kho ANstore.</li><li><strong>Thông tin liên hệ:</strong> địa chỉ Lệ Chi Viên, Đại Việt thời Lê. Hotline 090-XXX-XXXX từ thứ Hai đến thứ Bảy (08:00 - 17:00), Chủ nhật (08:00 - 12:00). Email matan@anstore.vn.</li></ol>`
      });
    }
  }

  // ==================== DATA SELECTORS ====================
  getProducts(includeHidden = false): Product[] {
    const all = this.products$.value;
    return includeHidden ? all : all.filter((p) => p.status !== 'HIDDEN');
  }

  getProduct(productId: number): Product | null {
    return this.products$.value.find((p) => p.id === Number(productId)) || null;
  }

  getCategoryName(categoryId: string): string {
    return this.categories$.value.find((c) => c.id === categoryId)?.name || categoryId;
  }

  getCurrentUser(): User | null {
    return this.currentUser$.value;
  }

  isAdminLoggedIn(): boolean {
    return this.adminLoggedIn$.value;
  }

  getUserAddresses(): Address[] {
    const user = this.currentUser$.value;
    if (!user) return [];
    return this.addresses$.value.filter((a) => a.userId === user.id);
  }

  getProductReviews(productId: number): Review[] {
    return this.reviews$.value
      .filter((r) => r.productId === Number(productId) && r.status === 'VISIBLE');
  }

  getPublishedBlogs(): BlogPost[] {
    const adminPosts = this.blogs$.value
      .filter((p) => p.status === 'PUBLISHED')
      .map((p) => ({ ...p, source: 'ADMIN' }));
    const userPosts: BlogPost[] = (this.userBlogSubmissions$.value || [])
      .filter((p) => p.status === 'APPROVED')
      .map((p) => ({
        id: 'user-' + p.id,
        title: p.title,
        excerpt: p.excerpt || String(p.content || '').slice(0, 120) + '...',
        image: p.image || '/img/products/4.png',
        date: p.createdAt,
        status: 'PUBLISHED',
        authorName: p.authorName,
        source: 'USER'
      }));
    return [...userPosts, ...adminPosts];
  }

  // ==================== CART LOGIC (CART-BR) ====================
  getCartItems(): CartItem[] {
    return this.cartItems$.value
      .map((item) => ({
        ...item,
        product: this.getProduct(item.productId) || undefined
      }))
      .filter((item) => Boolean(item.product));
  }

  getCartCount(): number {
    return this.cartItems$.value.reduce((total, item) => total + item.quantity, 0);
  }

  addToCart(productId: number, quantity = 1, attribute = 'Bản Tiêu Chuẩn'): void {
    const product = this.getProduct(productId);
    const amount = Number(quantity);
    if (!product || product.status === 'HIDDEN') throw new Error('Sản phẩm không tồn tại.');
    if (product.status === 'OUT_OF_STOCK' || product.stock <= 0) throw new Error('Sản phẩm hiện đã hết hàng.');
    if (!Number.isInteger(amount) || amount < 1) throw new Error('Số lượng không hợp lệ.');

    const current = [...this.cartItems$.value];
    const existing = current.find((item) => item.productId === product.id);
    const nextQty = (existing?.quantity || 0) + amount;
    if (nextQty > product.stock) {
      throw new Error('Số lượng bạn chọn đã đạt mức tối đa của sản phẩm này.');
    }
    const holdTime = Date.now() + 15 * 60 * 1000;
    if (existing) {
      existing.quantity = nextQty;
      existing.selected = true;
      if (attribute) existing.attribute = attribute;
      existing.reservedUntil = holdTime;
    } else {
      current.push(new CartItem(product.id, amount, true, attribute || 'Bản Tiêu Chuẩn', holdTime));
    }
    this.cartItems$.next(current);
    this.persistLocalSession();
  }

  updateCartAttribute(productId: number, attribute: string): void {
    const id = Number(productId);
    const next = this.cartItems$.value.map((item) =>
      item.productId === id ? { ...item, attribute } : item
    );
    this.cartItems$.next(next);
    this.persistLocalSession();
  }

  updateCartQuantity(productId: number, quantity: number): void {
    const product = this.getProduct(productId);
    const amount = Number(quantity);
    if (!product) throw new Error('Sản phẩm không tồn tại.');
    if (amount < 1) {
      this.removeFromCart(productId);
      return;
    }
    if (amount > product.stock) {
      throw new Error('Số lượng bạn chọn đã đạt mức tối đa của sản phẩm này.');
    }
    const current = [...this.cartItems$.value];
    const entry = current.find((item) => item.productId === product.id);
    if (!entry) throw new Error('Sản phẩm không có trong giỏ.');
    entry.quantity = amount;
    this.cartItems$.next(current);
    this.persistLocalSession();
  }

  removeFromCart(productId: number): void {
    const id = Number(productId);
    const next = this.cartItems$.value.filter((item) => item.productId !== id);
    this.cartItems$.next(next);
    this.persistLocalSession();
  }

  setCartItemSelected(productId: number, selected: boolean): void {
    const id = Number(productId);
    const next = this.cartItems$.value.map((item) =>
      item.productId === id ? { ...item, selected } : item
    );
    this.cartItems$.next(next);
    this.persistLocalSession();
  }

  setAllCartItemsSelected(selected: boolean): void {
    const next = this.cartItems$.value.map((item) => ({ ...item, selected }));
    this.cartItems$.next(next);
    this.persistLocalSession();
  }

  validateVoucherLocal(code: string, subtotal: number): { voucher: Voucher; discount: number; freeShipping: boolean } {
    const clean = String(code || '').trim().toUpperCase();
    const voucher = this.vouchers$.value.find((item) => item.code.toUpperCase() === clean);
    if (!voucher) throw new Error('Mã voucher không tồn tại.');
    const now = Date.now();
    if (voucher.status !== 'ACTIVE') throw new Error('Voucher hiện không còn hiệu lực.');
    if (now < new Date(voucher.startAt).getTime()) throw new Error('Voucher chưa đến thời gian áp dụng.');
    if (now > new Date(voucher.endAt).getTime()) throw new Error('Voucher đã hết hạn.');
    if (subtotal < voucher.minOrder) throw new Error('Đơn hàng chưa đạt giá trị tối thiểu của voucher.');
    if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) throw new Error('Voucher đã hết lượt sử dụng.');

    const user = this.currentUser$.value;
    if (user) {
      const alreadyUsedInOrders = this.orders$.value.some(
        (o) => o.userId === user.id && o.voucherCode?.toUpperCase() === clean && o.status !== 'CANCELLED'
      );
      const alreadyUsedInVoucher = Array.isArray(voucher.usedByUserIds) && voucher.usedByUserIds.includes(user.id);
      if (alreadyUsedInOrders || alreadyUsedInVoucher) {
        throw new Error(`Tài khoản của bạn đã sử dụng mã voucher ${clean} trước đó (mỗi tài khoản chỉ được áp dụng 1 lần).`);
      }
    }

    const freeShipping = voucher.type === 'shipping';
    let discount = freeShipping
      ? 0
      : voucher.type === 'percentage'
        ? (subtotal * voucher.value) / 100
        : voucher.value;
    if (voucher.maxDiscount) discount = Math.min(discount, voucher.maxDiscount);
    discount = Math.min(Math.round(discount), subtotal);
    return { voucher, discount, freeShipping };
  }

  cartSummary(voucherCode = ''): {
    items: CartItem[];
    subtotal: number;
    discount: number;
    shippingFee: number;
    total: number;
    voucher: Voucher | null;
  } {
    const items = this.getCartItems().filter((item) => item.selected && item.product);
    const subtotal = items.reduce((sum, item) => {
      const price = item.product!.discountPrice ?? item.product!.price;
      return sum + price * item.quantity;
    }, 0);
    const voucherResult = voucherCode ? this.validateVoucherLocal(voucherCode, subtotal) : null;
    const discount = voucherResult?.discount || 0;
    const baseShippingFee = subtotal >= 700000 || subtotal === 0 ? 0 : 30000;
    const shippingFee = voucherResult?.freeShipping ? 0 : baseShippingFee;
    return {
      items,
      subtotal,
      discount,
      shippingFee,
      total: subtotal - discount + shippingFee,
      voucher: voucherResult?.voucher || null
    };
  }

  // ==================== API ACTIONS (AUTH, PROFILE, ADDRESSES, ORDERS, ADMIN) ====================
  private extractErrorMessage(err: any): string {
    return err?.error?.message || err?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }

  async loginCustomer(identifier: string, password: string): Promise<User> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ user: User; accessToken: string }>('/api/auth/login', { identifier, password })
      );
      this.currentUser$.next(res.user);
      this.persistLocalSession();
      await this.syncStateFromBackend();
      return res.user;
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  async registerCustomer(input: any): Promise<User> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ user: User; accessToken: string }>('/api/auth/register', input)
      );
      this.currentUser$.next(res.user);
      this.persistLocalSession();
      await this.syncStateFromBackend();
      return res.user;
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  logoutCustomer(): void {
    this.currentUser$.next(null);
    this.persistLocalSession();
  }

  async requestPasswordReset(identifier: string): Promise<{ token: string; code: string; expiresAt: number; message: string }> {
    try {
      return await firstValueFrom(
        this.http.post<{ token: string; code: string; expiresAt: number; message: string }>(
          '/api/auth/forgot-password/request',
          { identifier }
        )
      );
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  async verifyPasswordReset(token: string, code: string): Promise<boolean> {
    try {
      await firstValueFrom(this.http.post('/api/auth/forgot-password/verify', { token, code }));
      return true;
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  async completePasswordReset(payload: { token: string; code: string; password: string; confirmPassword: string }): Promise<string> {
    try {
      const res = await firstValueFrom(this.http.post<{ message: string }>('/api/auth/forgot-password/complete', payload));
      return res.message;
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  async updateProfile(input: any): Promise<void> {
    const user = this.currentUser$.value;
    if (!user) throw new Error('Bạn cần đăng nhập để tiếp tục.');
    try {
      const res = await firstValueFrom(this.http.put<{ user: User }>(`/api/users/${user.id}`, input));
      this.currentUser$.next(res.user);
      this.persistLocalSession();
      await this.syncStateFromBackend();
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  async saveAddress(input: any): Promise<void> {
    const user = this.currentUser$.value;
    if (!user) throw new Error('Bạn cần đăng nhập để tiếp tục.');
    try {
      const list = await firstValueFrom(this.http.post<Address[]>('/api/addresses', { ...input, userId: user.id }));
      this.addresses$.next([
        ...this.addresses$.value.filter((a) => a.userId !== user.id),
        ...list
      ]);
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  async setDefaultAddress(addressId: number): Promise<void> {
    const user = this.currentUser$.value;
    if (!user) throw new Error('Bạn cần đăng nhập để tiếp tục.');
    try {
      const list = await firstValueFrom(
        this.http.put<Address[]>(`/api/addresses/${addressId}/default`, { userId: user.id })
      );
      this.addresses$.next([
        ...this.addresses$.value.filter((a) => a.userId !== user.id),
        ...list
      ]);
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  async deleteAddress(addressId: number): Promise<void> {
    const user = this.currentUser$.value;
    if (!user) throw new Error('Bạn cần đăng nhập để tiếp tục.');
    try {
      const list = await firstValueFrom(
        this.http.delete<Address[]>(`/api/addresses/${addressId}?userId=${user.id}`)
      );
      this.addresses$.next([
        ...this.addresses$.value.filter((a) => a.userId !== user.id),
        ...list
      ]);
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  copyVoucherCode(code: string): void {
    const clean = String(code || '').trim().toUpperCase();
    if (!clean) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(clean).catch(() => {});
    }
    this.showToast(`Đã sao chép mã voucher: ${clean}`);
  }

  async activateGuestAccount(payload: { identifier: string; otp: string; newPassword?: string }): Promise<{ message: string; user: User }> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ message: string; user: User; accessToken: string }>('/api/auth/activate-guest', payload)
      );
      this.currentUser$.next(res.user);
      this.persistLocalSession();
      await this.syncStateFromBackend();
      return res;
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  async checkoutOrder(input: {
    addressId?: number;
    paymentMethod: string;
    voucherCode?: string;
    guestInfo?: {
      fullName: string;
      phone: string;
      email: string;
      province: string;
      ward: string;
      detailAddress: string;
    };
  }): Promise<{
    success: boolean;
    code: string;
    orderId?: number;
    paymentMethod?: string;
    order?: Order;
    guestActivationInfo?: {
      email: string;
      phone: string;
      otp: string;
      activationLink: string;
      accountStatus: string;
      note: string;
    } | null;
    message?: string;
  }> {
    const user = this.currentUser$.value;
    if (!user && !input.guestInfo) {
      throw new Error('Vui lòng đăng nhập hoặc điền thông tin khách vãng lai để tiếp tục.');
    }
    const selectedItems = this.getCartItems().filter((item) => item.selected);
    if (!selectedItems.length) throw new Error('Vui lòng chọn ít nhất một sản phẩm để thanh toán.');

    try {
      const res = await firstValueFrom(
        this.http.post<any>('/api/orders/checkout', {
          userId: user ? user.id : undefined,
          addressId: input.addressId ? Number(input.addressId) : undefined,
          guestInfo: !user ? input.guestInfo : undefined,
          paymentMethod: input.paymentMethod,
          voucherCode: input.voucherCode || '',
          items: selectedItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            attribute: i.attribute || 'Bản Tiêu Chuẩn'
          }))
        })
      );
      if (res.success) {
        const orderedIds = new Set(selectedItems.map((i) => i.productId));
        this.cartItems$.next(this.cartItems$.value.filter((i) => !orderedIds.has(i.productId)));
        this.persistLocalSession();
        await this.syncStateFromBackend();
      }
      return res;
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  async confirmOrderReceived(orderId: number): Promise<{ message: string; order: Order }> {
    const user = this.currentUser$.value;
    try {
      const res = await firstValueFrom(
        this.http.post<{ message: string; order: Order }>(`/api/orders/${orderId}/confirm-received`, {
          userId: user?.id
        })
      );
      await this.syncStateFromBackend();
      return res;
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  getMyOrders(): Order[] {
    const user = this.currentUser$.value;
    if (!user) return [];
    return this.orders$.value.filter((o) => o.userId === user.id);
  }

  getOrder(orderId: number): Order | null {
    return this.orders$.value.find((o) => o.id === Number(orderId)) || null;
  }

  async cancelOrder(orderId: number, reason: string): Promise<{ immediate: boolean; message: string }> {
    const user = this.currentUser$.value;
    if (!user) throw new Error('Bạn cần đăng nhập để tiếp tục.');
    try {
      const res = await firstValueFrom(
        this.http.post<{ immediate: boolean; message: string }>(`/api/orders/${orderId}/cancel`, {
          userId: user.id,
          reason
        })
      );
      await this.syncStateFromBackend();
      return res;
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  reorder(orderId: number): void {
    const order = this.getOrder(orderId);
    if (!order) throw new Error('Không tìm thấy đơn hàng.');
    order.items.forEach((item) => {
      const prod = this.getProduct(item.productId);
      const qty = Math.min(item.quantity, prod?.stock || 0);
      if (qty > 0) this.addToCart(item.productId, qty);
    });
  }

  async submitReturnRequest(input: {
    orderId: number;
    productId: number;
    type: string;
    reason: string;
    evidenceName?: string | null;
    evidenceImage?: string | null;
    evidenceImages?: string[];
  }): Promise<void> {
    const user = this.currentUser$.value;
    if (!user) throw new Error('Bạn cần đăng nhập để tiếp tục.');
    try {
      await firstValueFrom(this.http.post('/api/returns', { ...input, userId: user.id }));
      await this.syncStateFromBackend();
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  async submitReview(input: { orderId: number; productId: number; rating: number; comment: string; imageName?: string | null }): Promise<void> {
    const user = this.currentUser$.value;
    if (!user) throw new Error('Bạn cần đăng nhập để tiếp tục.');
    try {
      await firstValueFrom(this.http.post('/api/reviews', { ...input, userId: user.id }));
      await this.syncStateFromBackend();
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  async submitUserBlog(input: { title: string; excerpt?: string; content: string; imageName?: string }): Promise<void> {
    const user = this.currentUser$.value;
    if (!user) throw new Error('Bạn cần đăng nhập để tiếp tục.');
    try {
      await firstValueFrom(this.http.post('/api/blogs/user-submit', { ...input, userId: user.id }));
      await this.syncStateFromBackend();
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  // ==================== ADMIN ACTIONS ====================
  async loginAdmin(email: string, password: string): Promise<void> {
    try {
      await firstValueFrom(this.http.post('/api/admin/login', { email, password }));
      this.adminLoggedIn$.next(true);
      this.persistLocalSession();
      await this.syncStateFromBackend();
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  logoutAdmin(): void {
    this.adminLoggedIn$.next(false);
    this.persistLocalSession();
  }

  async saveAdminProduct(input: any): Promise<void> {
    try {
      await firstValueFrom(this.http.post('/api/admin/products', input));
      await this.syncStateFromBackend();
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  async toggleProductVisibility(productId: number): Promise<void> {
    try {
      await firstValueFrom(this.http.put(`/api/admin/products/${productId}/toggle`, {}));
      await this.syncStateFromBackend();
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  async deleteProducts(productIds: number[]): Promise<void> {
    try {
      await firstValueFrom(this.http.post('/api/admin/products/bulk-delete', { productIds }));
      await this.syncStateFromBackend();
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  async saveCategory(input: { name: string; description?: string }): Promise<void> {
    try {
      await firstValueFrom(this.http.post('/api/admin/categories', input));
      await this.syncStateFromBackend();
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  async toggleCategory(categoryId: string): Promise<void> {
    try {
      await firstValueFrom(this.http.put(`/api/admin/categories/${categoryId}/toggle`, {}));
      await this.syncStateFromBackend();
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  async adjustInventory(
    productId: number,
    change: number,
    type = 'ADJUSTMENT',
    reason = 'Admin điều chỉnh tồn kho',
    extraMeta: {
      minStock?: number;
      batchCode?: string;
      importDate?: string;
      expiryDate?: string;
      warehouseLocation?: string;
      docCode?: string;
      performer?: string;
    } = {}
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post('/api/admin/inventory/adjust', {
          productId,
          change,
          type,
          reason,
          ...extraMeta
        })
      );
      await this.syncStateFromBackend();
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  async updateOrderStatus(orderId: number, status: string): Promise<void> {
    try {
      await firstValueFrom(this.http.put(`/api/admin/orders/${orderId}/status`, { status }));
      await this.syncStateFromBackend();
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  async resolveCancellationRequest(orderId: number, decision: 'APPROVED' | 'REJECTED', note = ''): Promise<void> {
    try {
      await firstValueFrom(this.http.put(`/api/admin/orders/${orderId}/cancellation`, { decision, note }));
      await this.syncStateFromBackend();
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  async saveVoucher(input: any): Promise<void> {
    try {
      await firstValueFrom(this.http.post('/api/admin/vouchers', input));
      await this.syncStateFromBackend();
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  async toggleVoucher(code: string): Promise<void> {
    try {
      await firstValueFrom(this.http.put(`/api/admin/vouchers/${code}/toggle`, {}));
      await this.syncStateFromBackend();
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  async resolveReturn(returnId: number, status: 'APPROVED' | 'REJECTED', note = ''): Promise<void> {
    try {
      await firstValueFrom(this.http.put(`/api/admin/returns/${returnId}`, { status, note }));
      await this.syncStateFromBackend();
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  async toggleReview(reviewId: number): Promise<void> {
    try {
      await firstValueFrom(this.http.put(`/api/admin/reviews/${reviewId}/toggle`, {}));
      await this.syncStateFromBackend();
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  async addBlog(input: { title: string; excerpt: string }, status = 'DRAFT'): Promise<void> {
    try {
      await firstValueFrom(this.http.post('/api/admin/blogs', { ...input, status }));
      await this.syncStateFromBackend();
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  async toggleBlog(postId: number | string): Promise<void> {
    try {
      await firstValueFrom(this.http.put(`/api/admin/blogs/${postId}/toggle`, {}));
      await this.syncStateFromBackend();
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  async resolveUserBlog(submissionId: number, status: 'APPROVED' | 'REJECTED', note = ''): Promise<void> {
    try {
      await firstValueFrom(this.http.put(`/api/admin/user-blogs/${submissionId}`, { status, note }));
      await this.syncStateFromBackend();
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }

  async createAdvisorTicket(payload: {
    customerName?: string;
    customerPhone?: string;
    emotionLevel: 'GREEN' | 'ORANGE' | 'RED';
    emotionLabel: string;
    originalMessage: string;
    softenedMessage: string;
  }): Promise<void> {
    try {
      await firstValueFrom(this.http.post('/api/advisor-tickets', payload));
      await this.syncStateFromBackend();
    } catch {
      // Fallback local update
      const current = [...this.advisorTickets$.value];
      const nextId = current.length + 1;
      const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      current.unshift({
        id: nextId,
        ticketCode: `TV-261108-0${nextId}`,
        customerName: payload.customerName || this.currentUser$.value?.fullName || 'Hoàng Lan',
        customerPhone: payload.customerPhone || this.currentUser$.value?.phone || '0704477397',
        emotionLevel: payload.emotionLevel,
        emotionColor: payload.emotionLevel === 'RED' ? '#ef4444' : (payload.emotionLevel === 'ORANGE' ? '#f59e0b' : '#22c55e'),
        emotionLabel: payload.emotionLabel,
        originalMessage: payload.originalMessage,
        softenedMessage: payload.softenedMessage,
        status: 'PENDING',
        advisorReply: '',
        createdAt: `Hôm nay ${nowTime}`,
        messages: [
          { role: 'user', text: payload.originalMessage, at: nowTime },
          { role: 'bot', text: `Chuyển ngữ đề xuất: "${payload.softenedMessage}"`, at: nowTime }
        ]
      });
      this.advisorTickets$.next(current);
      this.triggerTick();
    }
  }

  async replyAdvisorTicket(ticketId: number, reply: string, status = 'RESOLVED', emotionLevel = 'GREEN'): Promise<void> {
    try {
      await firstValueFrom(this.http.put(`/api/admin/advisor-tickets/${ticketId}/reply`, { reply, status, emotionLevel }));
      await this.syncStateFromBackend();
    } catch (err) {
      throw new Error(this.extractErrorMessage(err));
    }
  }
}
