const { createHash } = require('crypto');

function hashPassword(password) {
  return createHash('sha256').update(String(password || ''), 'utf8').digest('hex');
}

const categories = [
  { id: 'all', name: 'Tất cả sản phẩm', description: 'Toàn bộ hồ sơ và vật phẩm đang được lưu trữ.', hidden: false },
  { id: 'boardgame', name: 'BoardGame', description: 'Những vụ án lịch sử được kể bằng suy luận và nhập vai.', hidden: false },
  { id: 'combo', name: 'Combo', description: 'Bộ sưu tập trọn vẹn cho từng cấp bậc điều tra viên.', hidden: false },
  { id: 'merchandise', name: 'Merchandise', description: 'Vật phẩm mang dấu ấn của thế giới ẨN.', hidden: false },
  { id: 'accessory', name: 'Phụ kiện', description: 'Công cụ hỗ trợ mỗi cuộc phá án trên bàn chơi.', hidden: false }
];

const products = [
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
    storySummary: 'Năm 1442, chén ngọc vỡ tan trong đêm lạnh Lệ Chi Viên. Cái chết của bậc quân vương kéo theo những lời khai chồng chéo, mảnh vật chứng bị giấu kín và một bí mật cung đình có thể đổi hướng lịch sử. Người chơi phải đọc động cơ, đối chiếu chứng cứ và lần ra kẻ đã ẩn mình phía sau màn đêm.',
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
    id: 12,
    slug: 'bo-the-nhan-vat-vat-pham',
    sku: 'AN-PK-003',
    name: 'Bộ Thẻ Nhân Vật và Vật Phẩm',
    category: 'accessory',
    price: 89000,
    discountPrice: null,
    stock: 7,
    status: 'HIDDEN',
    featured: false,
    createdAt: '2026-06-01',
    images: ['/img/products/10.png', '/img/products/11.png'],
    description: 'Bộ thẻ mở rộng đang được hoàn thiện trước khi phát hành.',
    historicalPeriod: 'Đại Việt thế kỷ XV',
    gameType: 'Mở rộng suy luận',
    playerCount: '3-6 người',
    ageRating: '13+',
    duration: '30-45 phút mở rộng',
    difficulty: 'Khó',
    components: 'Thẻ nhân vật, vật phẩm và thẻ bí mật.',
    storySummary: 'Những nhân vật mới làm thay đổi toàn bộ cách đọc lời khai cũ.'
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

const vouchers = [
  { code: 'AN10', name: 'Mật mã nhập môn', type: 'percentage', value: 10, maxDiscount: 150000, minOrder: 500000, startAt: '2026-06-01T00:00:00+07:00', endAt: '2026-12-31T23:59:59+07:00', usageLimit: 200, usedCount: 18, usedByUserIds: [], status: 'ACTIVE' },
  { code: 'LECHI150', name: 'Hồ sơ Lệ Chi', type: 'fixed', value: 150000, maxDiscount: null, minOrder: 1000000, startAt: '2026-06-01T00:00:00+07:00', endAt: '2026-12-31T23:59:59+07:00', usageLimit: 100, usedCount: 24, usedByUserIds: [], status: 'ACTIVE' },
  { code: 'HETBIAN', name: 'Hồ sơ đã niêm phong', type: 'fixed', value: 50000, maxDiscount: null, minOrder: 300000, startAt: '2026-01-01T00:00:00+07:00', endAt: '2026-05-31T23:59:59+07:00', usageLimit: 20, usedCount: 20, usedByUserIds: [], status: 'EXPIRED' },
  { code: 'FREESHIP', name: 'Mật lệnh giao nhận', type: 'shipping', value: 30000, maxDiscount: 30000, minOrder: 300000, startAt: '2026-06-01T00:00:00+07:00', endAt: '2026-12-31T23:59:59+07:00', usageLimit: 150, usedCount: 12, usedByUserIds: [], status: 'ACTIVE' },
  { code: 'THAMTU50', name: 'Ưu đãi điều tra viên', type: 'fixed', value: 50000, maxDiscount: null, minOrder: 400000, startAt: '2026-07-01T00:00:00+07:00', endAt: '2026-12-31T23:59:59+07:00', usageLimit: 100, usedCount: 5, usedByUserIds: [], status: 'ACTIVE' }
];

const blogPosts = [
  { id: 1, title: 'Lệ Chi Viên: khi lịch sử trở thành một vụ án', excerpt: 'Từ một biến cố lịch sử, đội ngũ xây dựng cơ chế suy luận nhiều lớp như thế nào?', image: '/img/products/4.png', date: '24.06.2026', status: 'PUBLISHED', source: 'ADMIN' },
  { id: 2, title: 'Năm dấu hiệu của một lời khai chưa hoàn chỉnh', excerpt: 'Quan sát, đối chiếu và giữ một chút hoài nghi trước mọi nhân chứng.', image: '/img/products/10.png', date: '18.06.2026', status: 'PUBLISHED', source: 'ADMIN' },
  { id: 3, title: 'Thiết kế một bàn chơi đậm chất hồ sơ cổ', excerpt: 'Ánh sáng, nhịp chơi và những vật phẩm nhỏ làm nên trải nghiệm nhập vai.', image: '/img/products/12.png', date: '09.06.2026', status: 'DRAFT', source: 'ADMIN' }
];

const admins = [
  { id: 1, fullName: 'Nguyễn An', email: 'admin@anstore.vn', passwordHash: hashPassword('password'), role: 'SUPER_ADMIN', status: 'ACTIVE' }
];

const users = [
  { id: 1, fullName: 'Hoàng Lan', email: 'oanhntkk24411@st.uel.edu.vn', phone: '0704477397', passwordHash: hashPassword('0704477397'), dateOfBirth: '2003-03-15', status: 'ACTIVE' },
  { id: 2, fullName: 'Lê Ngọc Mai', email: 'mai.le@example.com', phone: '0901000002', passwordHash: hashPassword('password'), dateOfBirth: '2002-08-21', status: 'ACTIVE' },
  { id: 3, fullName: 'Phạm Gia Huy', email: 'huy.pham@example.com', phone: '0901000003', passwordHash: hashPassword('password'), dateOfBirth: '2001-11-09', password: 'password', status: 'ACTIVE' },
  { id: 4, fullName: 'Võ Thanh Hà', email: 'ha.vo@example.com', phone: '0901000004', passwordHash: hashPassword('password'), dateOfBirth: '2003-05-30', status: 'ACTIVE' },
  { id: 5, fullName: 'Đặng Quốc Bảo', email: 'bao.dang@example.com', phone: '0901000005', passwordHash: hashPassword('password'), dateOfBirth: '2000-12-12', status: 'ACTIVE' }
];

const addresses = [
  { id: 1, userId: 1, receiverName: 'Hoàng Lan', receiverPhone: '0704477397', province: 'Thành phố Hồ Chí Minh', district: 'Quận 3', ward: 'Phường Võ Thị Sáu', detailAddress: '18 đường Trần Quốc Thảo', label: 'Nhà riêng', isDefault: true },
  { id: 2, userId: 1, receiverName: 'Hoàng Lan', receiverPhone: '0704477397', province: 'Thành phố Hồ Chí Minh', district: 'Quận 1', ward: 'Phường Bến Nghé', detailAddress: '88 đường Nguyễn Huệ', label: 'Công ty', isDefault: false },
  { id: 3, userId: 2, receiverName: 'Lê Ngọc Mai', receiverPhone: '0901000002', province: 'Thành phố Hà Nội', district: 'Quận Hoàn Kiếm', ward: 'Phường Hàng Bạc', detailAddress: '25 phố Hàng Bạc', label: 'Nhà riêng', isDefault: true }
];

function sampleOrder(id, code, status, paymentStatus, createdAt, total) {
  const productId = id === 2 ? 2 : id === 3 ? 3 : id === 5 ? 5 : 1;
  return {
    id,
    code,
    userId: 1,
    status,
    paymentStatus,
    paymentMethod: paymentStatus === 'PENDING' ? 'COD' : 'MOCK_CARD',
    createdAt,
    subtotal: total,
    discount: 0,
    shippingFee: 0,
    total,
    voucherCode: null,
    stockDeducted: paymentStatus === 'SUCCESS' || paymentStatus === 'REFUNDED',
    address: {
      receiverName: 'Hoàng Lan',
      receiverPhone: '0704477397',
      detail: '18 đường Trần Quốc Thảo, Phường Võ Thị Sáu, Quận 3, Thành phố Hồ Chí Minh'
    },
    items: [{ productId, quantity: 1, unitPrice: total }],
    timeline: [{ status, at: createdAt }],
    cancellationRequest: null
  };
}

const orders = [
  sampleOrder(1, 'AN202606280001', 'PENDING', 'PENDING', '28.06.2026', 329000),
  sampleOrder(2, 'AN202606270002', 'CONFIRMED', 'SUCCESS', '27.06.2026', 389000),
  sampleOrder(3, 'AN202606260003', 'SHIPPING', 'SUCCESS', '26.06.2026', 699000),
  sampleOrder(4, 'AN202606200004', 'DELIVERED', 'SUCCESS', '20.06.2026', 329000),
  sampleOrder(5, 'AN202606180005', 'CANCELLED', 'REFUNDED', '18.06.2026', 199000)
];

const reviews = [
  { id: 1, userId: 1, productId: 1, orderId: 4, rating: 5, comment: 'Cốt truyện cuốn hút, chất lượng thẻ và hộp rất đẹp.', status: 'VISIBLE', createdAt: '24.06.2026' },
  { id: 2, userId: 4, productId: 4, orderId: 4, rating: 5, comment: 'Combo Hoàng Kim đóng gói kỹ, vật phẩm đẹp và rất hợp không khí trinh thám.', status: 'VISIBLE', createdAt: '22.06.2026' }
];

const inventoryTransactions = products.map((product, index) => ({
  id: index + 1,
  productId: product.id,
  orderId: null,
  type: 'IMPORT',
  change: product.stock,
  before: 0,
  after: product.stock,
  reason: 'Khởi tạo tồn kho mẫu',
  createdAt: '01.06.2026'
}));

const returnRequests = [
  {
    id: 1,
    code: 'RT20260629',
    orderId: 4,
    userId: 1,
    productId: 1,
    type: 'EXCHANGE',
    quantity: 1,
    reason: 'Một góc hộp hơi móp nhẹ khi vận chuyển, mong shop hỗ trợ kiểm tra.',
    evidenceName: '15.png',
    evidenceImage: '/img/products/15.png',
    evidenceImages: ['/img/products/15.png'],
    status: 'PENDING',
    adminNote: '',
    createdAt: '29.06.2026'
  }
];

const userBlogSubmissions = [
  {
    id: 1,
    userId: 2,
    authorName: 'Lê Ngọc Mai',
    title: 'Ván đầu tiên của nhóm tôi tại Lệ Chi Viên',
    excerpt: 'Nhóm chúng tôi mất gần hai giờ để phá án, mỗi người đều giữ một giả thuyết riêng.',
    content: 'Nhóm chúng tôi mất gần hai giờ để phá án. Điều thú vị nhất là mỗi người đều có giả thuyết khác nhau nhưng phải cùng đối chiếu chứng cứ để tìm ra hung thủ thực sự.',
    image: '/img/products/14.png',
    status: 'PENDING',
    adminNote: '',
    createdAt: '25.06.2026'
  }
];

const invoices = orders.map((order, idx) => ({
  id: idx + 1,
  invoiceCode: 'INV' + order.code.slice(2),
  orderId: order.id,
  invoiceDate: order.createdAt,
  subtotal: order.subtotal,
  discountAmount: order.discount,
  shippingFee: order.shippingFee,
  totalAmount: order.total,
  status: order.status === 'CANCELLED' ? 'CANCELLED' : 'ISSUED',
  note: order.paymentMethod === 'COD' ? 'Hóa đơn COD' : 'Hóa đơn thanh toán QR Online',
  createdAt: order.createdAt
}));

const advisorTickets = [
  {
    id: 1,
    ticketCode: 'TV-20260629-01',
    customerName: 'Hoàng Lan',
    customerPhone: '0704477397',
    emotionLevel: 'RED',
    emotionColor: '#ef4444',
    emotionLabel: 'Đỏ — Khách hàng đang bức xúc cao',
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
    emotionLabel: 'Cam — Khách hàng sốt ruột / Khiếu nại',
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
    emotionLabel: 'Xanh — Khách hàng bình tĩnh',
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

module.exports = {
  hashPassword,
  categories,
  products,
  vouchers,
  blogPosts,
  admins,
  users,
  addresses,
  orders,
  reviews,
  inventoryTransactions,
  returnRequests,
  userBlogSubmissions,
  invoices,
  advisorTickets
};
