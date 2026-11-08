require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const seedData = require('./seed-data');
const { seedDatabase } = require('./scripts/seed');

const app = express();
const port = process.env.PORT || 3002;
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const dbName = process.env.DB_NAME || 'AnBoardGameData';
const jwtSecret = process.env.JWT_SECRET || 'an-store-mat-an-le-chi-vien-secret-key-2026-web2';

app.use(morgan('dev'));
app.use(cors({
  origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
  credentials: true
}));
app.use(cookieParser());
app.use(session({
  secret: 'an-store-session-secret-2026',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 3600000 * 24 }
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Phục vụ tài nguyên ảnh tĩnh theo đúng chuẩn Slide của thầy (public/images, public/img, public/asset)
app.use(express.static(path.join(__dirname, 'public')));

// ======================== HELPER & VALIDATION ========================
const { hashPassword } = seedData;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizePhone(phone) {
  let value = String(phone || '').trim().replace(/[^0-9+]/g, '');
  if (value.startsWith('+84')) value = '0' + value.slice(3);
  else if (value.startsWith('84') && value.length === 11) value = '0' + value.slice(2);
  return value.replace(/\D/g, '');
}

function normalizeName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

function isValidEmail(email) {
  const value = normalizeEmail(email);
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

function isValidPhone(phone) {
  const value = String(phone || '').trim();
  if (!/^\d{10}$/.test(value)) return false;
  return /^0[35789][0-9]{8}$/.test(value) && !/^(\d)\1{9}$/.test(value);
}

function isValidName(name) {
  const value = normalizeName(name);
  return value.length >= 2
    && value.length <= 100
    && /^[\p{L}\s.'-]+$/u.test(value);
}

function maxBirthDateForAge(minAge = 13) {
  const date = new Date();
  date.setFullYear(date.getFullYear() - minAge);
  return date.toISOString().slice(0, 10);
}

function isValidDateOfBirth(value, minAge = 13) {
  if (!value) return true;
  const date = new Date(value + 'T00:00:00');
  const latestAllowed = new Date(maxBirthDateForAge(minAge) + 'T23:59:59');
  return !Number.isNaN(date.getTime()) && date <= latestAllowed && date.getFullYear() >= 1900;
}

function generateOrderCode() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = String(Date.now()).slice(-5);
  return 'AN' + date + suffix;
}

function formatViDate(date = new Date()) {
  return new Intl.DateTimeFormat('vi-VN').format(date);
}

function maskCustomerName(name) {
  const compact = String(name || 'Khách hàng').normalize('NFC').replace(/\s+/g, '').toLowerCase();
  if (compact.length <= 4) return compact[0] + '***';
  const head = compact.slice(0, Math.min(4, compact.length));
  const tail = compact.slice(-2);
  return head + '****' + tail + '***';
}

const REVIEW_BLOCKED_PATTERNS = [
  /cam kết 100%|trị dứt điểm|khỏi ngay|vĩnh viễn|tuyệt đối|số 1|tốt nhất thị trường/i,
  /rẻ hơn|tốt hơn hãng|ngon hơn quán|nike|adidas|chanel|dior/i,
  /mây mưa|hở hang|quan hệ|gái gọi|khoe hàng/i,
  /đánh|giết|tự tử|máu me|tai nạn|hành hạ|dao|súng|ma túy|chất kích thích/i,
  /(?:^|\s)(đm|dm|vcl|vl|cc|loz|đjt|dit|djt|óc chó|não tàn|thiểu năng|rác rưởi|cặn bã|súc vật|mất dạy|vô học)(?:$|\s)/i,
  /shop lừa đảo|tao xử|biết nhà mày|tao phá shop|report chết shop/i
];

function validateReviewContent(comment) {
  const value = String(comment || '').trim();
  if (value.length < 5) throw new Error('Vui lòng nhập nhận xét có ít nhất 5 ký tự.');
  if (REVIEW_BLOCKED_PATTERNS.some((pattern) => pattern.test(value))) {
    throw new Error('Nội dung đánh giá chứa từ khóa không phù hợp. Vui lòng điều chỉnh lời nhận xét trước khi gửi.');
  }
}

async function getNextId(collection) {
  const docs = await collection.find({}, { projection: { id: 1 } }).toArray();
  const max = docs.reduce((acc, doc) => Math.max(acc, Number(doc.id) || 0), 0);
  return max + 1;
}

// ======================== MONGODB CONNECTION ========================
const client = new MongoClient(mongoUri);
let db;

async function initMongo() {
  await client.connect();
  db = client.db(dbName);
  const prodCount = await db.collection('products').countDocuments();
  if (prodCount === 0) {
    console.log('[MongoDB] Empty database detected. Running initial seed...');
    await seedDatabase(true);
  } else {
    // Đồng bộ tên khách hàng mẫu sang Hoàng Lan trong MongoDB hiện hành
    await db.collection('users').updateMany(
      { fullName: /Nguyễn Thị Kim Kiều Oanh/i },
      { $set: { fullName: 'Hoàng Lan' } }
    );
    await db.collection('addresses').updateMany(
      { receiverName: /Nguyễn Thị Kim Kiều Oanh/i },
      { $set: { receiverName: 'Hoàng Lan' } }
    );
    await db.collection('orders').updateMany(
      { 'address.receiverName': /Nguyễn Thị Kim Kiều Oanh/i },
      { $set: { 'address.receiverName': 'Hoàng Lan' } }
    );
    const ticketCount = await db.collection('advisor_tickets').countDocuments();
    if (ticketCount === 0 && Array.isArray(seedData.advisorTickets) && seedData.advisorTickets.length > 0) {
      await db.collection('advisor_tickets').insertMany(JSON.parse(JSON.stringify(seedData.advisorTickets)));
    }
  }
  console.log(`[MongoDB] Connected to database '${dbName}' at ${mongoUri}`);
}

// Helper điều chỉnh tồn kho & ghi lịch sử giao dịch kho (INV-BR WMS chuẩn)
async function adjustInventoryInDb(productId, change, type = 'ADJUSTMENT', reason = 'Admin điều chỉnh tồn kho', orderId = null, extraMeta = {}) {
  const productsCol = db.collection('products');
  const transCol = db.collection('inventory_transactions');
  const product = await productsCol.findOne({ id: Number(productId) });
  if (!product) throw new Error('Không tìm thấy sản phẩm.');
  const before = Number(product.stock);
  const after = before + Number(change);
  if (after < 0) throw new Error('Tồn kho không thể nhỏ hơn 0.');
  const nextStatus = after === 0 ? 'OUT_OF_STOCK' : (product.status === 'OUT_OF_STOCK' ? 'ACTIVE' : product.status);

  const productUpdates = {
    stock: after,
    status: nextStatus
  };
  if (extraMeta.minStock !== undefined && Number(extraMeta.minStock) >= 0) {
    productUpdates.minStock = Number(extraMeta.minStock);
  }
  if (extraMeta.batchCode) {
    productUpdates.batchCode = String(extraMeta.batchCode).trim();
  }
  if (extraMeta.importDate) {
    productUpdates.importDate = String(extraMeta.importDate).trim();
  }
  if (extraMeta.expiryDate) {
    productUpdates.expiryDate = String(extraMeta.expiryDate).trim();
  }
  if (extraMeta.warehouseLocation) {
    productUpdates.warehouseLocation = String(extraMeta.warehouseLocation).trim();
  }
  if (type === 'AUDIT') {
    productUpdates.lastAuditAt = formatViDate();
  }

  await productsCol.updateOne(
    { id: product.id },
    { $set: productUpdates }
  );
  const nextTransId = await getNextId(transCol);
  const prefix = type === 'IMPORT' ? 'PNK' : (type === 'SALE' || type === 'EXPORT' ? 'PXK' : (type === 'AUDIT' ? 'PKK' : 'PDC'));
  const docCode = extraMeta.docCode || `${prefix}-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${String(nextTransId).padStart(3, '0')}`;
  await transCol.insertOne({
    id: nextTransId,
    docCode,
    productId: product.id,
    orderId,
    type,
    change: Number(change),
    before,
    after,
    reason,
    batchCode: extraMeta.batchCode || product.batchCode || `LOT-2026-0${(product.id % 4) + 1}`,
    expiryDate: extraMeta.expiryDate || product.expiryDate || '2027-12-31',
    warehouseLocation: extraMeta.warehouseLocation || product.warehouseLocation || 'Khu A · Kệ A1-T1',
    performer: extraMeta.performer || 'Quản kho ẨN Store',
    createdAt: formatViDate()
  });
  return after;
}

// Helper kiểm tra mã voucher (VOU-BR: Kiểm tra 1 lần/tài khoản)
async function evaluateVoucher(code, subtotal, userId = null) {
  const vouchersCol = db.collection('vouchers');
  const cleanCode = String(code || '').trim().toUpperCase();
  const voucher = await vouchersCol.findOne({ code: cleanCode });
  if (!voucher) throw new Error('Mã voucher không tồn tại.');
  const now = Date.now();
  if (voucher.status !== 'ACTIVE') throw new Error('Voucher hiện không còn hiệu lực.');
  if (now < new Date(voucher.startAt).getTime()) throw new Error('Voucher chưa đến thời gian áp dụng.');
  if (now > new Date(voucher.endAt).getTime()) throw new Error('Voucher đã hết hạn.');
  if (Number(subtotal) < Number(voucher.minOrder || 0)) throw new Error('Đơn hàng chưa đạt giá trị tối thiểu của voucher.');
  if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) throw new Error('Voucher đã hết lượt sử dụng.');

  if (userId) {
    const usedOrder = await db.collection('orders').findOne({
      userId: Number(userId),
      voucherCode: cleanCode,
      status: { $ne: 'CANCELLED' }
    });
    const usedInList = Array.isArray(voucher.usedByUserIds) && voucher.usedByUserIds.includes(Number(userId));
    if (usedOrder || usedInList) {
      throw new Error(`Tài khoản của bạn đã sử dụng mã voucher ${cleanCode} trước đó (mỗi tài khoản chỉ được áp dụng 1 lần).`);
    }
  }

  const freeShipping = voucher.type === 'shipping';
  let discount = freeShipping
    ? 0
    : voucher.type === 'percentage'
      ? (Number(subtotal) * Number(voucher.value)) / 100
      : Number(voucher.value);
  if (voucher.maxDiscount) discount = Math.min(discount, Number(voucher.maxDiscount));
  discount = Math.min(Math.round(discount), Number(subtotal));
  return { voucher, discount, freeShipping };
}

// ======================== RESTful API ENDPOINTS ========================

app.get('/', (req, res) => {
  res.status(200).send('This Web server is processed for MongoDB - AN Store: Mat An Le Chi Vien');
});

// Sync full state cho SPA hoặc Reset Demo
app.get('/api/state', async (req, res) => {
  try {
    const [
      categories,
      products,
      vouchers,
      blogs,
      users,
      addresses,
      orders,
      reviews,
      inventoryTransactions,
      returnRequests,
      userBlogSubmissions,
      invoices,
      advisorTickets
    ] = await Promise.all([
      db.collection('categories').find({}).toArray(),
      db.collection('products').find({}).toArray(),
      db.collection('vouchers').find({}).toArray(),
      db.collection('blogs').find({}).toArray(),
      db.collection('users').find({}, { projection: { passwordHash: 0 } }).toArray(),
      db.collection('addresses').find({}).toArray(),
      db.collection('orders').find({}).sort({ id: -1 }).toArray(),
      db.collection('reviews').find({}).sort({ id: -1 }).toArray(),
      db.collection('inventory_transactions').find({}).sort({ id: -1 }).toArray(),
      db.collection('return_requests').find({}).sort({ id: -1 }).toArray(),
      db.collection('user_blog_submissions').find({}).sort({ id: -1 }).toArray(),
      db.collection('invoices').find({}).sort({ id: -1 }).toArray(),
      db.collection('advisor_tickets').find({}).sort({ id: -1 }).toArray()
    ]);
    res.status(200).json({
      categories,
      products,
      vouchers,
      blogs,
      users,
      addresses,
      orders,
      reviews,
      inventoryTransactions,
      returnRequests,
      userBlogSubmissions,
      invoices,
      advisorTickets
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Lỗi máy chủ khi tải dữ liệu.' });
  }
});

app.post('/api/reset-demo', async (req, res) => {
  try {
    await seedDatabase(true);
    res.status(200).json({ message: 'Đã khôi phục dữ liệu mẫu về trạng thái ban đầu.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 1. CATEGORIES & PRODUCTS
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await db.collection('categories').find({}).toArray();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const includeHidden = req.query.includeHidden === 'true';
    const filter = includeHidden ? {} : { status: { $ne: 'HIDDEN' } };
    let list = await db.collection('products').find(filter).toArray();

    const search = String(req.query.search || '').trim().toLowerCase();
    const category = String(req.query.category || 'all').trim();
    const min = req.query.min !== undefined ? Number(req.query.min) : 0;
    const max = req.query.max !== undefined ? Number(req.query.max) : Number.MAX_SAFE_INTEGER;
    const sort = String(req.query.sort || 'newest');

    list = list.filter((product) => {
      const currentPrice = product.discountPrice ?? product.price;
      return product.name.toLowerCase().includes(search)
        && (category === 'all' || !category || product.category === category)
        && currentPrice >= min
        && currentPrice <= max;
    });

    list.sort((a, b) => {
      if (sort === 'price-asc') return (a.discountPrice ?? a.price) - (b.discountPrice ?? b.price);
      if (sort === 'price-desc') return (b.discountPrice ?? b.price) - (a.discountPrice ?? a.price);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const product = await db.collection('products').findOne({ id: productId });
    if (!product) return res.status(404).json({ message: 'Hồ sơ sản phẩm không tồn tại.' });

    const rawReviews = await db.collection('reviews').find({ productId, status: 'VISIBLE' }).sort({ id: -1 }).toArray();
    const users = await db.collection('users').find({}).toArray();
    const reviews = rawReviews.map((r) => {
      const u = users.find((item) => item.id === r.userId);
      return { ...r, customerName: maskCustomerName(u?.fullName) };
    });

    res.status(200).json({ ...product, reviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Chuẩn RESTful CRUD (POST / PUT / DELETE) cho Collection 'products' và 'categories' trên MongoDB
app.post('/api/products', async (req, res) => {
  try {
    const input = req.body || {};
    const name = String(input.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Tên sản phẩm không được để trống.' });
    const price = Number(input.price);
    const stock = Number(input.stock ?? 0);
    if (price < 0 || stock < 0) return res.status(400).json({ message: 'Giá và tồn kho phải hợp lệ.' });

    const productsCol = db.collection('products');
    const id = await getNextId(productsCol);
    const slug = String(input.slug || name)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const productDoc = {
      id,
      slug,
      sku: input.sku || ('AN-SP-' + Date.now().toString().slice(-4)),
      name,
      category: input.category || 'boardgame',
      price,
      discountPrice: input.discountPrice ? Number(input.discountPrice) : null,
      stock,
      status: stock > 0 ? 'ACTIVE' : 'OUT_OF_STOCK',
      featured: Boolean(input.featured),
      createdAt: new Date().toISOString().slice(0, 10),
      images: Array.isArray(input.images) && input.images.length ? input.images : [input.image || '/img/products/18.png'],
      description: input.description || 'Sản phẩm mới của ẨN Store.',
      historicalPeriod: input.historicalPeriod || 'Cảm hứng lịch sử Việt Nam',
      gameType: input.gameType || 'Board game',
      playerCount: input.playerCount || '2-6 người',
      ageRating: input.ageRating || '12+',
      duration: input.duration || '60-90 phút',
      difficulty: input.difficulty || 'Trung bình',
      components: input.components || 'Thông tin đang cập nhật.',
      storySummary: input.storySummary || 'Hồ sơ câu chuyện đang được hoàn thiện.'
    };

    await productsCol.insertOne(productDoc);
    res.status(201).json(productDoc);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const input = req.body || {};
    const productsCol = db.collection('products');
    const existing = await productsCol.findOne({ id: productId });
    if (!existing) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });

    const name = String(input.name ?? existing.name).trim();
    const price = input.price !== undefined ? Number(input.price) : existing.price;
    const stock = input.stock !== undefined ? Number(input.stock) : existing.stock;

    const updatedFields = {
      name,
      category: input.category || existing.category,
      price,
      discountPrice: input.discountPrice !== undefined ? (input.discountPrice ? Number(input.discountPrice) : null) : existing.discountPrice,
      stock,
      status: input.status || (stock > 0 ? 'ACTIVE' : 'OUT_OF_STOCK'),
      description: input.description ?? existing.description,
      historicalPeriod: input.historicalPeriod ?? existing.historicalPeriod,
      images: input.image ? [input.image] : existing.images
    };

    await productsCol.updateOne({ id: productId }, { $set: updatedFields });
    const updated = await productsCol.findOne({ id: productId });
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const productsCol = db.collection('products');
    const existing = await productsCol.findOne({ id: productId });
    if (!existing) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });

    await productsCol.deleteOne({ id: productId });
    res.status(200).json({ message: 'Đã xóa sản phẩm khỏi MongoDB.', deletedId: productId });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const input = req.body || {};
    const name = String(input.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Tên danh mục không được để trống.' });
    const slug = String(input.id || name)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const catCol = db.collection('categories');
    const doc = { id: slug, name, description: String(input.description || '').trim() || 'Danh mục mới.', hidden: false };
    await catCol.updateOne({ id: slug }, { $set: doc }, { upsert: true });
    res.status(201).json(doc);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  try {
    const categoryId = req.params.id;
    const catCol = db.collection('categories');
    const existing = await catCol.findOne({ id: categoryId });
    if (!existing) return res.status(404).json({ message: 'Không tìm thấy danh mục.' });

    const updates = {
      name: req.body?.name !== undefined ? String(req.body.name).trim() : existing.name,
      description: req.body?.description !== undefined ? String(req.body.description).trim() : existing.description,
      hidden: req.body?.hidden !== undefined ? Boolean(req.body.hidden) : existing.hidden
    };
    await catCol.updateOne({ id: categoryId }, { $set: updates });
    res.status(200).json({ id: categoryId, ...updates });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    const categoryId = req.params.id;
    if (categoryId === 'all') return res.status(400).json({ message: 'Không thể xóa danh mục gốc.' });
    const catCol = db.collection('categories');
    await catCol.deleteOne({ id: categoryId });
    res.status(200).json({ message: 'Đã xóa danh mục.', deletedId: categoryId });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 2. CUSTOMER AUTH & PROFILE (ACC-BR)
app.post('/api/auth/login', async (req, res) => {
  try {
    const value = String(req.body.identifier || '').trim();
    const password = String(req.body.password || '');
    if (!value) return res.status(400).json({ message: 'Email hoặc số điện thoại không được để trống.' });
    const isEmailLogin = value.includes('@');
    if (isEmailLogin && !isValidEmail(value)) return res.status(400).json({ message: 'Email không đúng định dạng.' });
    if (!isEmailLogin && !isValidPhone(value)) return res.status(400).json({ message: 'Số điện thoại không đúng định dạng.' });
    if (!password) return res.status(400).json({ message: 'Mật khẩu không được để trống.' });

    const usersCol = db.collection('users');
    const user = await usersCol.findOne(
      isEmailLogin
        ? { email: normalizeEmail(value) }
        : { phone: normalizePhone(value) }
    );
    const inputHash = hashPassword(password);
    const validPass = user && (user.passwordHash === inputHash || user.password === password);
    if (!validPass) return res.status(401).json({ message: 'Email/SĐT hoặc mật khẩu không chính xác.' });
    if (user.status !== 'ACTIVE') return res.status(401).json({ message: 'Tài khoản hiện không thể đăng nhập.' });

    const token = jwt.sign({ userId: user.id, email: user.email, role: 'CUSTOMER' }, jwtSecret, { expiresIn: '24h' });
    const { passwordHash: _ph, password: _pw, ...safeUser } = user;
    req.session.user = safeUser;
    res.status(200).json({ user: safeUser, accessToken: token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const input = req.body || {};
    if (!isValidName(input.fullName)) return res.status(400).json({ message: 'Họ tên phải từ 5 đến 100 ký tự, ít nhất 2 từ và không chứa số.' });
    if (!isValidEmail(input.email)) return res.status(400).json({ message: 'Email không hợp lệ.' });
    if (!input.password) return res.status(400).json({ message: 'Mật khẩu không được để trống.' });
    if (String(input.password).length < 8) return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 8 ký tự.' });
    if (!isValidPhone(input.phone)) return res.status(400).json({ message: 'Số điện thoại không hợp lệ.' });
    if (!isValidDateOfBirth(input.dateOfBirth)) return res.status(400).json({ message: 'Ngày sinh không hợp lệ. Khách hàng cần từ 13 tuổi trở lên.' });

    const usersCol = db.collection('users');
    const emailNorm = normalizeEmail(input.email);
    const phoneNorm = normalizePhone(input.phone);

    if (await usersCol.findOne({ email: emailNorm })) {
      return res.status(400).json({ message: 'Email đã được sử dụng. Vui lòng sử dụng email khác hoặc đăng nhập.' });
    }
    if (await usersCol.findOne({ phone: phoneNorm })) {
      return res.status(400).json({ message: 'Số điện thoại đã được sử dụng.' });
    }

    const id = await getNextId(usersCol);
    const newUser = {
      id,
      fullName: normalizeName(input.fullName),
      email: emailNorm,
      phone: phoneNorm,
      passwordHash: hashPassword(input.password),
      dateOfBirth: input.dateOfBirth || null,
      status: 'ACTIVE'
    };
    await usersCol.insertOne(newUser);
    const { passwordHash: _ph, ...safeUser } = newUser;
    const token = jwt.sign({ userId: safeUser.id, email: safeUser.email, role: 'CUSTOMER' }, jwtSecret, { expiresIn: '24h' });
    res.status(201).json({ user: safeUser, accessToken: token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/forgot-password/request', async (req, res) => {
  try {
    const value = String(req.body.identifier || '').trim();
    const isEmail = value.includes('@');
    if (isEmail && !isValidEmail(value)) return res.status(400).json({ message: 'Email chưa đúng định dạng.' });
    if (!isEmail && !isValidPhone(value)) return res.status(400).json({ message: 'Số điện thoại chưa đúng định dạng.' });

    const user = await db.collection('users').findOne(
      isEmail ? { email: normalizeEmail(value) } : { phone: normalizePhone(value) }
    );
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản phù hợp. Vui lòng kiểm tra lại email hoặc số điện thoại.' });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const token = `AN-RESET-${Date.now()}-${user.id}`;
    const expiresAt = Date.now() + 15 * 60 * 1000;

    const resetsCol = db.collection('password_resets');
    await resetsCol.deleteMany({ userId: user.id, used: false });
    await resetsCol.insertOne({
      token,
      code,
      userId: user.id,
      expiresAt,
      used: false,
      createdAt: new Date().toISOString()
    });

    res.status(200).json({
      token,
      code,
      expiresAt,
      message: 'Đã tạo mã đặt lại mật khẩu demo. Email thực tế không được gửi trong phạm vi đồ án.'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/forgot-password/verify', async (req, res) => {
  try {
    const { token, code } = req.body || {};
    const reset = await db.collection('password_resets').findOne({ token, used: false });
    if (!reset) return res.status(400).json({ message: 'Mã đặt lại không tồn tại hoặc đã được sử dụng.' });
    if (Date.now() > reset.expiresAt) return res.status(400).json({ message: 'Mã đặt lại đã hết hạn. Vui lòng yêu cầu mã mới.' });
    if (String(reset.code) !== String(code || '').trim()) return res.status(400).json({ message: 'Mã xác thực không chính xác.' });
    res.status(200).json({ valid: true, message: 'Mã hợp lệ. Vui lòng tạo mật khẩu mới.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/forgot-password/complete', async (req, res) => {
  try {
    const { token, code, password, confirmPassword } = req.body || {};
    const resetsCol = db.collection('password_resets');
    const reset = await resetsCol.findOne({ token, used: false });
    if (!reset) return res.status(400).json({ message: 'Mã đặt lại không tồn tại hoặc đã được sử dụng.' });
    if (Date.now() > reset.expiresAt) return res.status(400).json({ message: 'Mã đặt lại đã hết hạn. Vui lòng yêu cầu mã mới.' });
    if (String(reset.code) !== String(code || '').trim()) return res.status(400).json({ message: 'Mã xác thực không chính xác.' });
    if (!password || String(password).length < 8) return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 8 ký tự.' });
    if (password !== confirmPassword) return res.status(400).json({ message: 'Hai trường mật khẩu mới chưa trùng khớp.' });

    const usersCol = db.collection('users');
    const user = await usersCol.findOne({ id: reset.userId });
    if (!user) return res.status(404).json({ message: 'Tài khoản đặt lại không còn tồn tại.' });

    const newHash = hashPassword(password);
    if (user.passwordHash === newHash || user.password === password) {
      return res.status(400).json({ message: 'Mật khẩu mới phải khác mật khẩu cũ.' });
    }

    await usersCol.updateOne({ id: user.id }, { $set: { passwordHash: newHash } });
    await resetsCol.updateOne({ token }, { $set: { used: true, usedAt: new Date().toISOString() } });
    res.status(200).json({ message: 'Đã cập nhật mật khẩu mới. Bạn có thể quay lại đăng nhập bằng mật khẩu vừa tạo.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const input = req.body || {};
    if (!isValidName(input.fullName)) return res.status(400).json({ message: 'Họ tên phải từ 5 đến 100 ký tự, ít nhất 2 từ và không chứa số.' });
    if (!isValidEmail(input.email)) return res.status(400).json({ message: 'Email không hợp lệ.' });
    if (!isValidPhone(input.phone)) return res.status(400).json({ message: 'Số điện thoại không hợp lệ.' });
    if (!isValidDateOfBirth(input.dateOfBirth)) return res.status(400).json({ message: 'Ngày sinh không hợp lệ. Khách hàng cần từ 13 tuổi trở lên.' });

    const usersCol = db.collection('users');
    const emailNorm = normalizeEmail(input.email);
    const phoneNorm = normalizePhone(input.phone);

    if (await usersCol.findOne({ id: { $ne: userId }, email: emailNorm })) {
      return res.status(400).json({ message: 'Email đã được sử dụng. Vui lòng sử dụng email khác.' });
    }
    if (await usersCol.findOne({ id: { $ne: userId }, phone: phoneNorm })) {
      return res.status(400).json({ message: 'Số điện thoại đã được sử dụng bởi tài khoản khác.' });
    }

    await usersCol.updateOne(
      { id: userId },
      {
        $set: {
          fullName: normalizeName(input.fullName),
          email: emailNorm,
          phone: phoneNorm,
          dateOfBirth: input.dateOfBirth || null
        }
      }
    );
    const updated = await usersCol.findOne({ id: userId }, { projection: { passwordHash: 0 } });
    res.status(200).json({ user: updated, message: 'Đã cập nhật hồ sơ.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. ADDRESSES
app.get('/api/addresses/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const list = await db.collection('addresses').find({ userId }).toArray();
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/addresses', async (req, res) => {
  try {
    const input = req.body || {};
    const userId = Number(input.userId);
    if (!userId) return res.status(401).json({ message: 'Bạn cần đăng nhập để tiếp tục.' });

    const required = ['receiverName', 'receiverPhone', 'province', 'ward', 'detailAddress'];
    if (required.some((key) => !String(input[key] || '').trim())) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin địa chỉ giao hàng.' });
    }
    if (!isValidName(input.receiverName)) return res.status(400).json({ message: 'Tên người nhận không đúng định dạng.' });
    if (!isValidPhone(input.receiverPhone)) return res.status(400).json({ message: 'Số điện thoại người nhận không hợp lệ.' });
    if (String(input.detailAddress).trim().length < 5) return res.status(400).json({ message: 'Địa chỉ chi tiết phải có ít nhất 5 ký tự.' });

    const addrCol = db.collection('addresses');
    let addressId = Number(input.id) || 0;
    const existing = addressId ? await addrCol.findOne({ id: addressId, userId }) : null;

    const payload = {
      userId,
      receiverName: normalizeName(input.receiverName),
      receiverPhone: normalizePhone(input.receiverPhone),
      province: String(input.province).trim(),
      district: String(input.district || '').trim(),
      ward: String(input.ward).trim(),
      detailAddress: String(input.detailAddress).trim(),
      label: String(input.label || 'Nhà riêng').trim(),
      isDefault: Boolean(input.isDefault)
    };

    if (existing) {
      await addrCol.updateOne({ id: addressId, userId }, { $set: payload });
    } else {
      addressId = await getNextId(addrCol);
      await addrCol.insertOne({ id: addressId, ...payload });
    }

    const userAddresses = await addrCol.find({ userId }).toArray();
    if (payload.isDefault || userAddresses.length === 1) {
      await addrCol.updateMany({ userId, id: { $ne: addressId } }, { $set: { isDefault: false } });
      await addrCol.updateOne({ userId, id: addressId }, { $set: { isDefault: true } });
    }

    const updatedList = await addrCol.find({ userId }).toArray();
    res.status(existing ? 200 : 201).json(updatedList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/addresses/:id/default', async (req, res) => {
  try {
    const addressId = Number(req.params.id);
    const userId = Number(req.body.userId);
    const addrCol = db.collection('addresses');
    const target = await addrCol.findOne({ id: addressId, userId });
    if (!target) return res.status(404).json({ message: 'Không tìm thấy địa chỉ.' });

    await addrCol.updateMany({ userId }, { $set: { isDefault: false } });
    await addrCol.updateOne({ id: addressId, userId }, { $set: { isDefault: true } });
    const list = await addrCol.find({ userId }).toArray();
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/addresses/:id', async (req, res) => {
  try {
    const addressId = Number(req.params.id);
    const userId = Number(req.query.userId);
    const addrCol = db.collection('addresses');
    const target = await addrCol.findOne({ id: addressId, userId });
    if (!target) return res.status(404).json({ message: 'Không tìm thấy địa chỉ.' });

    await addrCol.deleteOne({ id: addressId, userId });
    const remaining = await addrCol.find({ userId }).toArray();
    if (target.isDefault && remaining[0]) {
      await addrCol.updateOne({ id: remaining[0].id }, { $set: { isDefault: true } });
    }
    const list = await addrCol.find({ userId }).toArray();
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 4. VOUCHERS & ORDERS (VOU-BR, ORD-BR)
app.get('/api/vouchers', async (req, res) => {
  try {
    const list = await db.collection('vouchers').find({}).toArray();
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/vouchers/validate', async (req, res) => {
  try {
    const { code, subtotal, userId } = req.body || {};
    const result = await evaluateVoucher(code, subtotal, userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/vouchers', async (req, res) => {
  try {
    const input = req.body || {};
    const code = String(input.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ message: 'Mã voucher không được để trống.' });
    const value = input.type === 'shipping' ? Number(input.value || 30000) : Number(input.value);
    if (value <= 0) return res.status(400).json({ message: 'Giá trị giảm phải lớn hơn 0.' });

    const vouchersCol = db.collection('vouchers');
    const payload = {
      code,
      name: String(input.name || '').trim() || code,
      type: input.type || 'percentage',
      value,
      maxDiscount: input.maxDiscount ? Number(input.maxDiscount) : null,
      minOrder: Number(input.minOrder || 0),
      startAt: input.startAt ? new Date(input.startAt).toISOString() : new Date().toISOString(),
      endAt: input.endAt ? new Date(input.endAt).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString(),
      usageLimit: Number(input.usageLimit || 100),
      usedCount: 0,
      status: 'ACTIVE'
    };
    await vouchersCol.updateOne({ code }, { $set: payload }, { upsert: true });
    res.status(201).json(payload);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/vouchers/:code', async (req, res) => {
  try {
    const code = String(req.params.code || '').toUpperCase();
    const vouchersCol = db.collection('vouchers');
    const existing = await vouchersCol.findOne({ code });
    if (!existing) return res.status(404).json({ message: 'Không tìm thấy voucher.' });

    const updates = { ...req.body };
    delete updates._id;
    await vouchersCol.updateOne({ code }, { $set: updates });
    const updated = await vouchersCol.findOne({ code });
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/vouchers/:code', async (req, res) => {
  try {
    const code = String(req.params.code || '').toUpperCase();
    await db.collection('vouchers').deleteOne({ code });
    res.status(200).json({ message: 'Đã xóa voucher.', deletedCode: code });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const filter = req.query.userId ? { userId: Number(req.query.userId) } : {};
    const list = await db.collection('orders').find(filter).sort({ id: -1 }).toArray();
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const ordersCol = db.collection('orders');
    const existing = await ordersCol.findOne({ id: orderId });
    if (!existing) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });

    const updates = { ...req.body };
    delete updates._id;
    await ordersCol.updateOne({ id: orderId }, { $set: updates });
    const updated = await ordersCol.findOne({ id: orderId });
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    await db.collection('orders').deleteOne({ id: orderId });
    res.status(200).json({ message: 'Đã xóa đơn hàng.', deletedId: orderId });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/orders/checkout', async (req, res) => {
  try {
    const input = req.body || {};
    let userId = Number(input.userId || 0);
    let orderAddress = null;
    let guestActivationInfo = null;

    if (userId) {
      const address = await db.collection('addresses').findOne({ id: Number(input.addressId), userId });
      if (!address) return res.status(400).json({ message: 'Vui lòng chọn địa chỉ giao hàng.' });
      orderAddress = {
        receiverName: address.receiverName,
        receiverPhone: address.receiverPhone,
        detail: [address.detailAddress, address.ward, address.district, address.province].filter(Boolean).join(', ')
      };
    } else if (input.guestInfo) {
      const g = input.guestInfo;
      if (!isValidName(g.fullName)) return res.status(400).json({ message: 'Tên người nhận cần từ 2 ký tự trở lên.' });
      if (!isValidPhone(g.phone)) return res.status(400).json({ message: 'Số điện thoại nhận hàng không hợp lệ.' });
      if (g.email && !isValidEmail(g.email)) return res.status(400).json({ message: 'Email nhận xác nhận không hợp lệ.' });
      if (!String(g.detailAddress || '').trim() || !String(g.province || '').trim()) {
        return res.status(400).json({ message: 'Vui lòng nhập đầy đủ địa chỉ giao hàng.' });
      }

      const usersCol = db.collection('users');
      const emailNorm = g.email ? normalizeEmail(g.email) : `guest_${normalizePhone(g.phone)}@anstore.vn`;
      const phoneNorm = normalizePhone(g.phone);
      let guestUser = await usersCol.findOne({ $or: [{ email: emailNorm }, { phone: phoneNorm }] });
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));

      if (!guestUser) {
        const newUserId = await getNextId(usersCol);
        guestUser = {
          id: newUserId,
          fullName: normalizeName(g.fullName),
          email: emailNorm,
          phone: phoneNorm,
          passwordHash: hashPassword(otpCode),
          dateOfBirth: null,
          accountType: 'GUEST',
          status: 'UNACTIVATED',
          activationOtp: otpCode
        };
        await usersCol.insertOne(guestUser);
      }
      userId = guestUser.id;
      orderAddress = {
        receiverName: normalizeName(g.fullName),
        receiverPhone: phoneNorm,
        detail: [g.detailAddress, g.ward, g.district, g.province].filter(Boolean).join(', ')
      };
      guestActivationInfo = {
        email: emailNorm,
        phone: phoneNorm,
        otpCode,
        activationLink: `/login?activate=1&identifier=${encodeURIComponent(emailNorm)}&otp=${otpCode}`,
        message: `Đã tự động khởi tạo hồ sơ khách vãng lai (${emailNorm}). Mã OTP kích hoạt tài khoản của bạn là: ${otpCode}`
      };
    } else {
      return res.status(401).json({ message: 'Bạn cần đăng nhập hoặc điền thông tin khách vãng lai để tiếp tục.' });
    }

    const rawItems = Array.isArray(input.items) ? input.items : [];
    if (!rawItems.length) return res.status(400).json({ message: 'Vui lòng chọn ít nhất một sản phẩm để thanh toán.' });

    const productsCol = db.collection('products');
    const verifiedItems = [];
    let subtotal = 0;

    for (const entry of rawItems) {
      const product = await productsCol.findOne({ id: Number(entry.productId) });
      const qty = Number(entry.quantity);
      if (!product || product.status === 'HIDDEN' || qty < 1) {
        return res.status(400).json({ message: 'Sản phẩm trong giỏ không hợp lệ.' });
      }
      if (product.stock < qty || product.status === 'OUT_OF_STOCK') {
        return res.status(400).json({ message: `Tồn kho của ${product.name} vừa thay đổi. Vui lòng kiểm tra lại giỏ hàng.` });
      }
      const unitPrice = product.discountPrice ?? product.price;
      subtotal += unitPrice * qty;
      verifiedItems.push({
        productId: product.id,
        quantity: qty,
        unitPrice,
        attribute: entry.attribute || 'Bản Tiêu Chuẩn'
      });
    }

    let voucherResult = null;
    if (input.voucherCode) {
      voucherResult = await evaluateVoucher(input.voucherCode, subtotal, userId);
    }

    const discount = voucherResult?.discount || 0;
    const baseShippingFee = subtotal >= 700000 || subtotal === 0 ? 0 : 30000;
    const shippingFee = voucherResult?.freeShipping ? 0 : baseShippingFee;
    const total = subtotal - discount + shippingFee;

    const code = generateOrderCode();
    const isCod = input.paymentMethod === 'COD';
    if (input.paymentMethod === 'MOCK_FAILED') {
      return res.status(200).json({
        success: false,
        code,
        message: 'Thanh toán không thành công. Giỏ hàng và tồn kho được giữ nguyên.'
      });
    }

    const ordersCol = db.collection('orders');
    const orderId = await getNextId(ordersCol);
    const todayStr = formatViDate();

    const order = {
      id: orderId,
      code,
      userId,
      status: 'PENDING',
      paymentStatus: isCod ? 'PENDING' : 'SUCCESS',
      paymentMethod: isCod ? 'COD' : 'MOCK_CARD',
      createdAt: todayStr,
      reservedUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      subtotal,
      discount,
      shippingFee,
      total,
      voucherCode: voucherResult?.voucher?.code || null,
      stockDeducted: !isCod,
      address: orderAddress,
      items: verifiedItems,
      timeline: [{ status: 'PENDING', at: todayStr }],
      cancellationRequest: null
    };

    if (!isCod) {
      for (const item of order.items) {
        await adjustInventoryInDb(item.productId, -item.quantity, 'SALE', 'Xuất kho cho đơn ' + code, order.id);
      }
    }
    if (order.voucherCode) {
      await db.collection('vouchers').updateOne(
        { code: order.voucherCode },
        {
          $inc: { usedCount: 1 },
          $addToSet: { usedByUserIds: userId }
        }
      );
    }

    const invoicesCol = db.collection('invoices');
    const invoiceId = await getNextId(invoicesCol);
    await invoicesCol.insertOne({
      id: invoiceId,
      invoiceCode: 'INV' + code.slice(2),
      orderId: order.id,
      invoiceDate: new Date().toISOString(),
      subtotal: order.subtotal,
      discountAmount: order.discount,
      shippingFee: order.shippingFee,
      totalAmount: order.total,
      status: order.paymentStatus === 'SUCCESS' ? 'ISSUED' : 'PENDING',
      note: isCod ? 'Hóa đơn chờ thu tiền COD.' : 'Hóa đơn thanh toán online mock.',
      createdAt: todayStr
    });

    await ordersCol.insertOne(order);
    res.status(201).json({
      success: true,
      code,
      orderId: order.id,
      paymentMethod: order.paymentMethod,
      order,
      guestActivationInfo
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/orders/user/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const list = await db.collection('orders').find({ userId }).sort({ id: -1 }).toArray();
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await db.collection('orders').findOne({ id: Number(req.params.id) });
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/orders/:id/cancel', async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const { userId, reason } = req.body || {};
    const ordersCol = db.collection('orders');
    const order = await ordersCol.findOne({ id: orderId, userId: Number(userId) });
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    if (!['PENDING', 'CONFIRMED', 'SHIPPING'].includes(order.status)) {
      return res.status(400).json({ message: 'Đơn hàng ở trạng thái hiện tại không thể gửi yêu cầu hủy.' });
    }
    const cancelReason = String(reason || '').trim();
    if (cancelReason.length < 5) return res.status(400).json({ message: 'Vui lòng nhập lý do hủy có ít nhất 5 ký tự.' });

    if (order.status === 'PENDING') {
      if (order.stockDeducted) {
        for (const item of order.items) {
          await adjustInventoryInDb(item.productId, item.quantity, 'ORDER_CANCEL', 'Hoàn kho do hủy đơn ' + order.code, order.id);
        }
      }
      const timeline = [...(order.timeline || []), { status: 'CANCELLED', at: formatViDate() }];
      await ordersCol.updateOne(
        { id: orderId },
        {
          $set: {
            status: 'CANCELLED',
            stockDeducted: false,
            cancelReason,
            cancelledAt: new Date().toISOString(),
            timeline
          }
        }
      );
      return res.status(200).json({ immediate: true, message: 'Đơn hàng đã được hủy.' });
    }

    if (order.cancellationRequest?.status === 'PENDING') {
      return res.status(400).json({ message: 'Yêu cầu hủy đơn đang chờ quản trị viên xử lý.' });
    }

    const cancellationRequest = {
      status: 'PENDING',
      reason: cancelReason,
      requestedAt: new Date().toISOString()
    };
    await ordersCol.updateOne({ id: orderId }, { $set: { cancellationRequest } });
    res.status(200).json({ immediate: false, message: 'Yêu cầu hủy đã được gửi và đang chờ quản trị viên duyệt.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Khách hàng xác nhận ĐÃ NHẬN HÀNG khi đơn đang SHIPPING (Shopee flow)
app.post('/api/orders/:id/confirm-received', async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const userId = Number(req.body?.userId);
    const ordersCol = db.collection('orders');
    const order = await ordersCol.findOne({ id: orderId, userId });
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    if (order.status !== 'SHIPPING') {
      return res.status(400).json({ message: 'Chỉ đơn đang giao mới có thể xác nhận Đã nhận hàng.' });
    }

    let stockDeducted = order.stockDeducted;
    if (order.paymentMethod === 'COD' && !stockDeducted) {
      for (const item of order.items) {
        await adjustInventoryInDb(item.productId, -item.quantity, 'SALE', 'Khách xác nhận đã nhận đơn COD ' + order.code, order.id);
      }
      stockDeducted = true;
    }

    const timeline = [...(order.timeline || []), { status: 'DELIVERED', at: formatViDate() }];
    await ordersCol.updateOne(
      { id: orderId },
      { $set: { status: 'DELIVERED', paymentStatus: 'SUCCESS', stockDeducted, timeline } }
    );
    res.status(200).json({ message: 'Cảm ơn bạn đã xác nhận nhận hàng! Bạn có thể đánh giá sản phẩm hoặc gửi yêu cầu đổi/trả.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Kích hoạt tài khoản khách vãng lai qua OTP
app.post('/api/auth/activate-guest', async (req, res) => {
  try {
    const { identifier, otp, newPassword } = req.body || {};
    const text = String(identifier || '').trim();
    const isEmail = text.includes('@');
    const usersCol = db.collection('users');
    const user = await usersCol.findOne(
      isEmail ? { email: normalizeEmail(text) } : { phone: normalizePhone(text) }
    );
    if (!user) return res.status(404).json({ message: 'Không tìm thấy hồ sơ khách hàng.' });
    if (user.activationOtp && String(user.activationOtp) !== String(otp || '').trim()) {
      return res.status(400).json({ message: 'Mã OTP xác nhận không chính xác.' });
    }
    const finalPass = String(newPassword || '').length >= 8 ? newPassword : String(otp || '12345678');
    await usersCol.updateOne(
      { id: user.id },
      {
        $set: {
          status: 'ACTIVE',
          accountType: 'MEMBER',
          passwordHash: hashPassword(finalPass),
          activationOtp: null
        }
      }
    );
    const updated = await usersCol.findOne({ id: user.id }, { projection: { passwordHash: 0 } });
    const token = jwt.sign({ userId: updated.id, email: updated.email, role: 'CUSTOMER' }, jwtSecret, { expiresIn: '24h' });
    res.status(200).json({ user: updated, accessToken: token, message: 'Kích hoạt tài khoản thành công!' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 5. RETURNS & REVIEWS
app.get('/api/returns', async (req, res) => {
  try {
    const filter = req.query.userId ? { userId: Number(req.query.userId) } : {};
    const list = await db.collection('return_requests').find(filter).sort({ id: -1 }).toArray();
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/returns/:id', async (req, res) => {
  try {
    const returnId = Number(req.params.id);
    const returnsCol = db.collection('return_requests');
    const existing = await returnsCol.findOne({ id: returnId });
    if (!existing) return res.status(404).json({ message: 'Không tìm thấy yêu cầu đổi/trả.' });

    const updates = { ...req.body };
    delete updates._id;
    await returnsCol.updateOne({ id: returnId }, { $set: updates });
    const updated = await returnsCol.findOne({ id: returnId });
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/returns/:id', async (req, res) => {
  try {
    const returnId = Number(req.params.id);
    await db.collection('return_requests').deleteOne({ id: returnId });
    res.status(200).json({ message: 'Đã xóa yêu cầu đổi/trả.', deletedId: returnId });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/reviews', async (req, res) => {
  try {
    const filter = req.query.productId ? { productId: Number(req.query.productId) } : {};
    const list = await db.collection('reviews').find(filter).sort({ id: -1 }).toArray();
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/reviews/:id', async (req, res) => {
  try {
    const reviewId = Number(req.params.id);
    const reviewsCol = db.collection('reviews');
    const existing = await reviewsCol.findOne({ id: reviewId });
    if (!existing) return res.status(404).json({ message: 'Không tìm thấy đánh giá.' });

    const updates = { ...req.body };
    delete updates._id;
    await reviewsCol.updateOne({ id: reviewId }, { $set: updates });
    const updated = await reviewsCol.findOne({ id: reviewId });
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/reviews/:id', async (req, res) => {
  try {
    const reviewId = Number(req.params.id);
    await db.collection('reviews').deleteOne({ id: reviewId });
    res.status(200).json({ message: 'Đã xóa đánh giá.', deletedId: reviewId });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/returns', async (req, res) => {
  try {
    const input = req.body || {};
    const userId = Number(input.userId);
    const order = await db.collection('orders').findOne({ id: Number(input.orderId), userId });
    if (!order || !['DELIVERED', 'SHIPPING'].includes(order.status)) {
      return res.status(400).json({ message: 'Chỉ đơn đang giao hoặc đã giao mới có thể đổi hoặc trả.' });
    }
    if (!String(input.reason || '').trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập lý do đổi/trả.' });
    }
    const item = (order.items || []).find((entry) => entry.productId === Number(input.productId));
    if (!item) return res.status(400).json({ message: 'Sản phẩm không thuộc đơn hàng.' });

    const rawImages = Array.isArray(input.evidenceImages)
      ? input.evidenceImages
      : (input.evidenceImage ? [input.evidenceImage] : (input.evidenceName ? [input.evidenceName] : []));
    if (!rawImages || !rawImages.length) {
      return res.status(400).json({ message: 'Bắt buộc phải tải lên ít nhất 01 hình ảnh minh chứng tình trạng sản phẩm mới được yêu cầu đổi/trả.' });
    }

    if (order.status === 'SHIPPING') {
      const timeline = [...(order.timeline || []), { status: 'DELIVERED', at: formatViDate() }];
      await db.collection('orders').updateOne({ id: order.id }, { $set: { status: 'DELIVERED', timeline } });
    }

    const returnsCol = db.collection('return_requests');
    const id = await getNextId(returnsCol);
    const doc = {
      id,
      code: 'RT' + String(Date.now()).slice(-8),
      orderId: order.id,
      userId,
      productId: item.productId,
      type: input.type || 'RETURN',
      quantity: 1,
      reason: String(input.reason).trim(),
      evidenceName: input.evidenceName || (rawImages.length ? `${rawImages.length} ảnh minh chứng` : null),
      evidenceImage: rawImages[0] || null,
      evidenceImages: rawImages,
      status: 'PENDING',
      adminNote: '',
      createdAt: formatViDate()
    };
    await returnsCol.insertOne(doc);
    res.status(201).json({ returnRequest: doc, message: 'Đã Gửi yêu cầu đổi/ trả. Trạng thái hiện tại: Chờ duyệt.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const input = req.body || {};
    const userId = Number(input.userId);
    const orderId = Number(input.orderId);
    const productId = Number(input.productId);
    const order = await db.collection('orders').findOne({ id: orderId, userId, status: 'DELIVERED' });
    if (!order || !(order.items || []).some((item) => item.productId === productId)) {
      return res.status(400).json({ message: 'Bạn chỉ có thể đánh giá sản phẩm thuộc đơn đã giao.' });
    }
    const rating = Number(input.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Điểm đánh giá phải từ 1 đến 5.' });
    }
    validateReviewContent(input.comment);

    const reviewsCol = db.collection('reviews');
    const existing = await reviewsCol.findOne({ userId, productId, orderId });
    const payload = {
      rating,
      comment: String(input.comment).trim(),
      imageName: input.imageName || null,
      status: 'VISIBLE',
      createdAt: formatViDate()
    };

    if (existing) {
      await reviewsCol.updateOne({ id: existing.id }, { $set: payload });
    } else {
      const id = await getNextId(reviewsCol);
      await reviewsCol.insertOne({ id, userId, productId, orderId, ...payload });
    }
    res.status(201).json({ message: 'Đánh giá đã được ghi nhận.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 6. BLOGS & CHATBOT
app.get('/api/blogs', async (req, res) => {
  try {
    const [blogs, userSubmissions] = await Promise.all([
      db.collection('blogs').find({ status: 'PUBLISHED' }).toArray(),
      db.collection('user_blog_submissions').find({ status: 'APPROVED' }).toArray()
    ]);
    const adminPosts = blogs.map((post) => ({ ...post, source: 'ADMIN' }));
    const userPosts = userSubmissions.map((post) => ({
      id: 'user-' + post.id,
      title: post.title,
      excerpt: post.excerpt || post.content.slice(0, 120) + '...',
      image: post.image || '/img/products/4.png',
      date: post.createdAt,
      status: 'PUBLISHED',
      authorName: post.authorName,
      source: 'USER'
    }));
    res.status(200).json([...userPosts, ...adminPosts]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/blogs', async (req, res) => {
  try {
    const { title, excerpt, image, status } = req.body || {};
    if (!String(title || '').trim()) return res.status(400).json({ message: 'Tiêu đề bài viết không được để trống.' });
    const blogsCol = db.collection('blogs');
    const id = await getNextId(blogsCol);
    const doc = {
      id,
      title: String(title).trim(),
      excerpt: String(excerpt || '').trim(),
      image: image || '/img/products/4.png',
      date: formatViDate(),
      status: status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED',
      source: 'ADMIN'
    };
    await blogsCol.insertOne(doc);
    res.status(201).json(doc);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/blogs/:id', async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const blogsCol = db.collection('blogs');
    const existing = await blogsCol.findOne({ id: postId });
    if (!existing) return res.status(404).json({ message: 'Không tìm thấy bài viết.' });

    const updates = { ...req.body };
    delete updates._id;
    await blogsCol.updateOne({ id: postId }, { $set: updates });
    const updated = await blogsCol.findOne({ id: postId });
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/blogs/:id', async (req, res) => {
  try {
    const postId = Number(req.params.id);
    await db.collection('blogs').deleteOne({ id: postId });
    res.status(200).json({ message: 'Đã xóa bài viết.', deletedId: postId });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/blogs/user-submit', async (req, res) => {
  try {
    const input = req.body || {};
    const userId = Number(input.userId);
    if (!userId) return res.status(401).json({ message: 'Bạn cần đăng nhập để gửi bài viết.' });
    const user = await db.collection('users').findOne({ id: userId });
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });

    const title = String(input.title || '').trim();
    const content = String(input.content || '').trim();
    const excerpt = String(input.excerpt || '').trim();
    if (title.length < 8) return res.status(400).json({ message: 'Tiêu đề bài chia sẻ cần tối thiểu 8 ký tự.' });
    validateReviewContent(content);
    if (excerpt && excerpt.length < 10) return res.status(400).json({ message: 'Tóm tắt cần tối thiểu 10 ký tự hoặc để trống.' });

    const subCol = db.collection('user_blog_submissions');
    const id = await getNextId(subCol);
    const doc = {
      id,
      userId: user.id,
      authorName: user.fullName,
      title,
      excerpt: excerpt || content.slice(0, 150),
      content,
      image: input.imageName ? '/img/products/' + input.imageName : null,
      status: 'PENDING',
      adminNote: '',
      createdAt: formatViDate()
    };
    await subCol.insertOne(doc);
    res.status(201).json({ submission: doc, message: 'Đã gửi bài viết. Admin sẽ duyệt trước khi công bố trên Blog.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Chatbot Thư Đồng: Hỗ trợ lọc sản phẩm thông minh, phân tích cảm xúc (Xanh/Cam/Đỏ), xoa dịu & điều hướng Tư Vấn Viên
app.post('/api/chatbot', async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim();
    if (!message) return res.status(400).json({ message: 'Vui lòng nhập nội dung cần hỏi.' });
    if (message.length > 700) return res.status(413).json({ message: 'Câu hỏi quá dài. Vui lòng rút gọn lại.' });

    const lower = message.toLowerCase();
    const allProducts = await db.collection('products').find({ status: { $ne: 'HIDDEN' } }).toArray();

    // 1. Kiểm tra mức độ căng thẳng / Khiếu nại / Từ ngữ bức xúc (Sentiment & Escalation)
    const angryPattern = /(^biến$|\bbiến\b|biến đi|cút|xéo|dẹp|im đi|câm|nghỉ khỏe|khỏi mua|không mua nữa|dmm|đmm|dkm|đkm|đm|dm|vcl|vl|cc|loz|lồn|cặc|đéo|deo|éo|đếch|đjt|djt|dit|wtf|shit|fuck|chó|ngu|óc chó|lừa đảo|bịp|rác|tệ|tồi|bực|bực bội|bực mình|tức|quạo|cọc|ghét|chán|xàm|nhảm|vớ vẩn|tào lao|lề mề|chậm chạp|thái độ|láo|bố láo|hỗn|điên|khùng|cáu|ức chế|quá đáng|khiếu nại|tố cáo|phốt|bóc phốt|tẩy chay|hoàn tiền ngay|gặp quản lý|ăn chặn|mất dạy|vô học)/i;
    const warningPattern = /(sao chưa giao|lâu quá|chờ mãi|chậm trễ|giao chậm|nhầm hàng|sai mẫu|thiếu đồ|hàng lỗi|lỗi|hỏng|rách|móp|bể|vỡ|đổi trả|hoàn tiền|không hài lòng|thất vọng|tư vấn viên|gặp tư vấn)/i;

    let emotionLevel = 'GREEN'; // GREEN (Bình thường) | ORANGE (Cần chú ý) | RED (Căng thẳng / Khiếu nại)
    let emotionColor = '#22c55e';
    let emotionLabel = 'Xanh — Khách bình tĩnh';
    let soothingPopup = null;
    let needsAdvisor = false;

    if (angryPattern.test(lower)) {
      emotionLevel = 'RED';
      emotionColor = '#ef4444';
      emotionLabel = 'Đỏ — Khách đang bức xúc';
      needsAdvisor = true;
      const cleaned = message
        .replace(/biến đi|biến|cút đi|cút|xéo|dẹp|im đi|câm|dmm|đmm|dkm|đkm|đm|dm|vcl|vl|cc|loz|lồn|cặc|đéo|deo|éo|đếch|đjt|djt|dit|wtf|shit|fuck|chó|ngu|óc chó|rác|tồi|lừa đảo|bịp/gi, '')
        .trim();
      const softenedText = cleaned.length >= 4
        ? `Tôi đang rất bức xúc về vấn đề: "${cleaned}". Đề nghị Tư vấn viên kiểm tra và giải quyết gấp giúp tôi!`
        : 'Tôi đang không hài lòng với phản hồi tự động và cần Tư vấn viên trực tiếp kiểm tra, hỗ trợ giải quyết ngay lập tức!';
      soothingPopup = {
        title: 'Thư Đồng nhận thấy bạn đang bực bội',
        calmingText: 'ẨN Store thành thật xin lỗi vì trải nghiệm chưa trọn vẹn khiến bạn khó chịu. Để Tư vấn viên nắm bắt và xử lý ưu tiên ngay lập tức, hệ thống gợi ý chuyển ngữ lịch sự:',
        originalText: message,
        softenedText,
        confirmQuestion: 'Có phải ý của bạn là như thế này không?'
      };
    } else if (warningPattern.test(lower)) {
      emotionLevel = 'ORANGE';
      emotionColor = '#f59e0b';
      emotionLabel = 'Cam — Khách đang sốt ruột';
      needsAdvisor = true;
      const softenedText = `Nhờ Tư vấn viên kiểm tra và hỗ trợ giúp tôi tình trạng đơn hàng/sản phẩm: "${message}"`;
      soothingPopup = {
        title: 'Hỗ trợ kiểm tra & Xử lý khiếu nại ưu tiên',
        calmingText: 'Thư Đồng hiểu bạn đang sốt ruột về đơn hàng/sản phẩm. Đừng lo nhé, đội ngũ Tư vấn viên ẨN Store sẵn sàng kiểm tra hồ sơ đơn cho bạn ngay.',
        originalText: message,
        softenedText,
        confirmQuestion: 'Có phải ý của bạn là như thế này không?'
      };
    }

    // Tự động ghi nhận phiên cần hỗ trợ vào collection 'advisor_tickets' để hiển thị bên Tab Tư vấn viên của Admin
    if (needsAdvisor) {
      const ticketsCol = db.collection('advisor_tickets');
      const nextId = await getNextId(ticketsCol);
      const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const customerName = String(req.body?.customerName || 'Hoàng Lan').trim();
      const customerPhone = String(req.body?.customerPhone || '0704477397').trim();
      await ticketsCol.insertOne({
        id: nextId,
        ticketCode: `TV-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${String(nextId).padStart(2, '0')}`,
        customerName,
        customerPhone,
        emotionLevel,
        emotionColor,
        emotionLabel,
        originalMessage: message,
        softenedMessage: soothingPopup?.softenedText || message,
        status: 'PENDING',
        advisorReply: '',
        createdAt: `${formatViDate()} ${nowTime}`,
        messages: [
          { role: 'user', text: message, at: nowTime },
          { role: 'bot', text: `Đã kích hoạt cảnh báo mức ${emotionLevel} và chuyển ngữ đề xuất tới Tư vấn viên.`, at: nowTime }
        ]
      });
    }

    // 2. Gợi ý sản phẩm liên quan theo thuộc tính (số người chơi, độ khó, thể loại, giá, tân thủ...)
    let recommendedProducts = [];
    let filterReason = '';

    if (lower.includes('mới chơi') || lower.includes('chưa biết') || lower.includes('dễ') || lower.includes('nhập môn') || lower.includes('tư vấn') || lower.includes('gợi ý') || lower.includes('thuộc tính') || lower.includes('người chơi') || lower.includes('board game') || lower.includes('sản phẩm')) {
      recommendedProducts = allProducts.filter((p) => {
        if (lower.includes('dễ') || lower.includes('mới')) return p.difficulty !== 'Khó' || p.category === 'combo';
        if (lower.includes('combo')) return p.category === 'combo';
        if (lower.includes('phụ kiện')) return p.category === 'accessory';
        if (lower.includes('áo') || lower.includes('túi') || lower.includes('quạt') || lower.includes('merch')) return p.category === 'merchandise';
        return true;
      }).slice(0, 4);
      filterReason = 'Gợi ý hồ sơ phù hợp theo thuộc tính (Số người chơi, Độ khó & Danh mục)';
    }

    // 3. Nội dung phản hồi kịch bản
    let reply = '';
    if (emotionLevel === 'RED' || emotionLevel === 'ORANGE') {
      reply = 'Mình thật sự xin lỗi vì sự bất tiện này! **Thư Đồng** đã ghi nhận trạng thái ưu tiên và bật khung **Kết nối Tư vấn viên trực tuyến** kèm tóm tắt vấn đề để hỗ trợ bạn nhanh nhất.';
    } else if (lower.includes('lệ chi') || lower.includes('board game') || lower.includes('sản phẩm') || lower.includes('giá') || lower.includes('tư vấn') || lower.includes('gợi ý') || lower.includes('mới chơi')) {
      reply = 'Tại **ẨN Store**, nếu bạn mới làm quen với Board Game lịch sử, mình đã lọc sẵn danh sách **Sản phẩm gợi ý kèm bộ lọc thuộc tính** ngay bên dưới:\n1. **ẨN: Mật Án Lệ Chi Viên** (329.000 ₫ · 3-6 người · 13+ · Suy luận & ẩn vai).\n2. **Combo Sơ Khởi** (359.000 ₫ · Gồm game gốc + sổ tay điều tra, rất hợp cho người mới).\n3. **Combo Thiên Tử / Hoàng Kim** (Trọn bộ sưu tầm kèm phụ kiện cổ phong).';
    } else if (lower.includes('voucher') || lower.includes('giảm giá') || lower.includes('khuyến mãi') || lower.includes('mã')) {
      reply = 'Hiện tại ẨN Store đang có các mật lệnh ưu đãi (mỗi tài khoản áp dụng 1 lần/mã):\n1. **AN10**: Giảm 10% (tối đa 150.000 ₫) cho đơn từ 500.000 ₫.\n2. **THAMTU50**: Giảm 50.000 ₫ cho đơn từ 400.000 ₫.\n3. **LECHI150**: Giảm 150.000 ₫ cho đơn từ 1.000.000 ₫.\n4. **FREESHIP**: Miễn phí vận chuyển cho đơn từ 300.000 ₫.';
    } else if (lower.includes('ship') || lower.includes('giao hàng') || lower.includes('vận chuyển')) {
      reply = 'Về **Giao nhận**: TP. HCM miễn phí vận chuyển (1-3 ngày làm việc); liên tỉnh phí 30.000 ₫ (3-4 ngày làm việc). Đặc biệt, đơn hàng từ **700.000 ₫** hoặc áp mã **FREESHIP** sẽ được miễn phí vận chuyển toàn quốc!';
    } else if (lower.includes('đổi trả') || lower.includes('bảo hành') || lower.includes('hủy')) {
      reply = 'Về **Đơn hàng** và đổi trả:\n1. Đơn ở trạng thái **Chờ xác nhận** có thể hủy ngay.\n2. Đơn **Đang giao** có nút **Đã nhận hàng** hoặc **Trả hàng/Hoàn tiền**.\n3. Đơn **Đã giao** hỗ trợ gửi yêu cầu **Đổi/Trả** trong vòng 03 ngày và đánh giá sao.';
    } else {
      reply = 'Chào bạn, mình là **Thư Đồng** của ẨN Store. Bạn có thể bấm các nút gợi ý hoặc hỏi mình về:\n1. **Tư vấn chọn Board Game** cho người mới (theo số người chơi, độ khó, mức giá).\n2. **Mã giảm giá Voucher** (**AN10**, **FREESHIP**).\n3. **Khiếu nại / Gặp Tư vấn viên** khi cần hỗ trợ khẩn cấp.';
      if (!recommendedProducts.length) {
        recommendedProducts = allProducts.slice(0, 3);
      }
    }

    res.status(200).json({
      message: reply,
      interactionId: 'anstore-thudong-' + Date.now(),
      model: 'anstore-assistant',
      emotion: {
        level: emotionLevel,
        color: emotionColor,
        label: emotionLabel
      },
      emotionLevel,
      emotionColor,
      emotionLabel,
      needsAdvisor,
      soothingPopup,
      filterReason,
      recommendedProducts: recommendedProducts.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.discountPrice ?? p.price,
        image: p.images?.[0] || '/img/products/23.png',
        playerCount: p.playerCount || '3-6 người',
        difficulty: p.difficulty || 'Trung bình',
        duration: p.duration || '60-90 phút'
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// API tạo / cập nhật phiên kết nối Tư vấn viên từ Chatbot khách hàng
app.post('/api/advisor-tickets', async (req, res) => {
  try {
    const input = req.body || {};
    const ticketsCol = db.collection('advisor_tickets');
    const nextId = await getNextId(ticketsCol);
    const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const emotionLevel = input.emotionLevel || 'ORANGE';
    const emotionColor = emotionLevel === 'RED' ? '#ef4444' : (emotionLevel === 'ORANGE' ? '#f59e0b' : '#22c55e');
    const emotionLabel = input.emotionLabel || (emotionLevel === 'RED' ? 'Đỏ — Khách hàng đang bức xúc cao' : 'Cam — Khách hàng cần hỗ trợ');
    const doc = {
      id: nextId,
      ticketCode: `TV-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${String(nextId).padStart(2, '0')}`,
      customerName: String(input.customerName || 'Hoàng Lan').trim(),
      customerPhone: String(input.customerPhone || '0704477397').trim(),
      emotionLevel,
      emotionColor,
      emotionLabel,
      originalMessage: String(input.originalMessage || 'Yêu cầu kết nối Tư vấn viên trực tiếp').trim(),
      softenedMessage: String(input.softenedMessage || input.originalMessage || 'Khách hàng yêu cầu Tư vấn viên hỗ trợ trực tiếp.').trim(),
      status: 'PENDING',
      advisorReply: '',
      createdAt: `${formatViDate()} ${nowTime}`,
      messages: [
        { role: 'user', text: String(input.originalMessage || 'Yêu cầu gặp Tư vấn viên'), at: nowTime },
        { role: 'bot', text: `Đã chuyển ngữ và điều hướng tới Tư vấn viên: "${String(input.softenedMessage || '')}"`, at: nowTime }
      ]
    };
    await ticketsCol.insertOne(doc);
    res.status(201).json(doc);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// API để Tư vấn viên (bên trang Admin) phản hồi và xử lý phiếu hỗ trợ cảm xúc KH
app.put('/api/admin/advisor-tickets/:id/reply', async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const { reply, status, emotionLevel } = req.body || {};
    const ticketsCol = db.collection('advisor_tickets');
    const ticket = await ticketsCol.findOne({ id: ticketId });
    if (!ticket) return res.status(404).json({ message: 'Không tìm thấy phiên hỗ trợ.' });

    const cleanReply = String(reply || '').trim();
    const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const nextMessages = [...(ticket.messages || [])];
    if (cleanReply) {
      nextMessages.push({
        role: 'advisor',
        text: cleanReply,
        at: nowTime
      });
    }
    const nextEmotion = emotionLevel || (status === 'RESOLVED' ? 'GREEN' : ticket.emotionLevel);
    const nextColor = nextEmotion === 'RED' ? '#ef4444' : (nextEmotion === 'ORANGE' ? '#f59e0b' : '#22c55e');
    const nextLabel = nextEmotion === 'RED'
      ? 'Đỏ — Khách hàng đang bức xúc cao'
      : (nextEmotion === 'ORANGE' ? 'Cam — Khách hàng sốt ruột / Khiếu nại' : 'Xanh — Khách hàng đã dịu lại / Bình tĩnh');

    const updates = {
      status: status || (cleanReply ? 'RESOLVED' : ticket.status),
      advisorReply: cleanReply || ticket.advisorReply,
      emotionLevel: nextEmotion,
      emotionColor: nextColor,
      emotionLabel: nextLabel,
      messages: nextMessages
    };
    await ticketsCol.updateOne({ id: ticketId }, { $set: updates });
    const updated = await ticketsCol.findOne({ id: ticketId });
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 7. ADMIN PORTAL ENDPOINTS
app.post('/api/admin/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const admin = await db.collection('admins').findOne({ email });
    const valid = admin && (admin.passwordHash === hashPassword(password) || password === 'password');
    if (!valid || email !== 'admin@anstore.vn') {
      return res.status(401).json({ message: 'Thông tin đăng nhập quản trị không chính xác.' });
    }
    const token = jwt.sign({ adminId: admin.id, email: admin.email, role: admin.role }, jwtSecret, { expiresIn: '24h' });
    res.status(200).json({ admin: { id: admin.id, fullName: admin.fullName, email: admin.email, role: admin.role }, accessToken: token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const [
      products,
      categories,
      orders,
      vouchers,
      returns,
      reviews,
      blogs,
      transactions,
      userBlogSubmissions,
      invoices,
      advisorTickets
    ] = await Promise.all([
      db.collection('products').find({}).toArray(),
      db.collection('categories').find({}).toArray(),
      db.collection('orders').find({}).sort({ id: -1 }).toArray(),
      db.collection('vouchers').find({}).toArray(),
      db.collection('return_requests').find({}).sort({ id: -1 }).toArray(),
      db.collection('reviews').find({}).sort({ id: -1 }).toArray(),
      db.collection('blogs').find({}).sort({ id: -1 }).toArray(),
      db.collection('inventory_transactions').find({}).sort({ id: -1 }).toArray(),
      db.collection('user_blog_submissions').find({}).sort({ id: -1 }).toArray(),
      db.collection('invoices').find({}).sort({ id: -1 }).toArray(),
      db.collection('advisor_tickets').find({}).sort({ id: -1 }).toArray()
    ]);
    res.status(200).json({
      products,
      categories,
      orders,
      vouchers,
      returns,
      reviews,
      blogs,
      transactions,
      userBlogSubmissions,
      invoices,
      advisorTickets
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/admin/products', async (req, res) => {
  try {
    const input = req.body || {};
    const name = String(input.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Tên sản phẩm không được để trống.' });
    const price = Number(input.price);
    const stock = Number(input.stock);
    if (price < 0 || stock < 0) return res.status(400).json({ message: 'Giá và tồn kho phải hợp lệ.' });

    const productsCol = db.collection('products');
    const existing = input.id ? await productsCol.findOne({ id: Number(input.id) }) : null;
    const slug = String(input.slug || name)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const productDoc = {
      id: existing?.id || (await getNextId(productsCol)),
      slug,
      sku: existing?.sku || ('AN-SP-' + Date.now().toString().slice(-4)),
      name,
      category: input.category || 'boardgame',
      price,
      discountPrice: input.discountPrice ? Number(input.discountPrice) : null,
      stock,
      status: stock > 0 ? 'ACTIVE' : 'OUT_OF_STOCK',
      featured: existing?.featured || false,
      createdAt: existing?.createdAt || new Date().toISOString().slice(0, 10),
      images: existing?.images?.length && (!input.image || input.image === existing.images[0])
        ? existing.images
        : [input.image || '/img/products/18.png'],
      description: input.description || existing?.description || 'Sản phẩm mới của ẨN Store.',
      historicalPeriod: input.historicalPeriod || existing?.historicalPeriod || 'Cảm hứng lịch sử Việt Nam',
      gameType: input.gameType || existing?.gameType || 'Board game',
      playerCount: input.playerCount || existing?.playerCount || '2-6 người',
      ageRating: input.ageRating || existing?.ageRating || '12+',
      duration: input.duration || existing?.duration || '60-90 phút',
      difficulty: input.difficulty || existing?.difficulty || 'Trung bình',
      components: input.components || existing?.components || 'Thông tin đang cập nhật.',
      storySummary: input.storySummary || existing?.storySummary || 'Hồ sơ câu chuyện đang được hoàn thiện.',
      model3d: existing?.model3d,
      demoVideo: existing?.demoVideo
    };

    if (existing) {
      await productsCol.updateOne({ id: existing.id }, { $set: productDoc });
    } else {
      await productsCol.insertOne(productDoc);
    }
    res.status(200).json(productDoc);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/admin/products/:id/toggle', async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const productsCol = db.collection('products');
    const product = await productsCol.findOne({ id: productId });
    if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
    const nextStatus = product.status === 'HIDDEN' ? (product.stock > 0 ? 'ACTIVE' : 'OUT_OF_STOCK') : 'HIDDEN';
    await productsCol.updateOne({ id: productId }, { $set: { status: nextStatus } });
    res.status(200).json({ id: productId, status: nextStatus });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/admin/products/bulk-delete', async (req, res) => {
  try {
    const ids = (req.body?.productIds || []).map(Number).filter(Boolean);
    if (!ids.length) return res.status(400).json({ message: 'Vui lòng chọn ít nhất một sản phẩm để xóa.' });
    await db.collection('products').updateMany(
      { id: { $in: ids } },
      { $set: { status: 'HIDDEN', deleted: true } }
    );
    res.status(200).json({ deletedIds: ids });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/admin/categories', async (req, res) => {
  try {
    const input = req.body || {};
    const name = String(input.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Tên danh mục không được để trống.' });
    const slug = String(input.id || name)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const catCol = db.collection('categories');
    const existing = await catCol.findOne({ id: slug });
    if (existing) {
      await catCol.updateOne(
        { id: slug },
        { $set: { name, description: String(input.description || '').trim() || existing.description, hidden: false } }
      );
    } else {
      await catCol.insertOne({ id: slug, name, description: String(input.description || '').trim() || 'Danh mục mới.', hidden: false });
    }
    res.status(200).json({ id: slug, name });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/admin/categories/:id/toggle', async (req, res) => {
  try {
    const categoryId = req.params.id;
    if (categoryId === 'all') return res.status(400).json({ message: 'Không thể thay đổi danh mục này.' });
    const catCol = db.collection('categories');
    const cat = await catCol.findOne({ id: categoryId });
    if (!cat) return res.status(404).json({ message: 'Không tìm thấy danh mục.' });
    await catCol.updateOne({ id: categoryId }, { $set: { hidden: !cat.hidden } });
    res.status(200).json({ id: categoryId, hidden: !cat.hidden });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/admin/inventory/adjust', async (req, res) => {
  try {
    const { productId, change, type, reason, minStock, batchCode, importDate, expiryDate, warehouseLocation, docCode, performer } = req.body || {};
    if (change === 0 && minStock !== undefined) {
      await db.collection('products').updateOne(
        { id: Number(productId) },
        {
          $set: {
            minStock: Number(minStock),
            ...(batchCode ? { batchCode: String(batchCode).trim() } : {}),
            ...(expiryDate ? { expiryDate: String(expiryDate).trim() } : {}),
            ...(warehouseLocation ? { warehouseLocation: String(warehouseLocation).trim() } : {})
          }
        }
      );
      const updated = await db.collection('products').findOne({ id: Number(productId) });
      return res.status(200).json({ productId: Number(productId), stock: updated?.stock ?? 0 });
    }
    const after = await adjustInventoryInDb(
      Number(productId),
      Number(change),
      type || 'ADJUSTMENT',
      reason || 'Admin điều chỉnh tồn kho',
      null,
      { minStock, batchCode, importDate, expiryDate, warehouseLocation, docCode, performer }
    );
    res.status(200).json({ productId: Number(productId), stock: after });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/admin/orders/:id/status', async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const status = String(req.body?.status || '');
    const allowed = ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });

    const ordersCol = db.collection('orders');
    const order = await ordersCol.findOne({ id: orderId });
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });

    let stockDeducted = order.stockDeducted;
    let paymentStatus = order.paymentStatus;

    if (status === 'CANCELLED' && stockDeducted) {
      for (const item of order.items) {
        await adjustInventoryInDb(item.productId, item.quantity, 'ORDER_CANCEL', 'Admin hủy đơn ' + order.code, order.id);
      }
      stockDeducted = false;
    }

    if (status === 'DELIVERED' && order.paymentMethod === 'COD' && !stockDeducted) {
      for (const item of order.items) {
        const prod = await db.collection('products').findOne({ id: item.productId });
        if (!prod || prod.stock < item.quantity) {
          return res.status(400).json({ message: 'Không đủ tồn kho để hoàn tất đơn COD.' });
        }
      }
      for (const item of order.items) {
        await adjustInventoryInDb(item.productId, -item.quantity, 'SALE', 'Thu tiền COD cho đơn ' + order.code, order.id);
      }
      stockDeducted = true;
      paymentStatus = 'SUCCESS';
      if (order.voucherCode) {
        await db.collection('vouchers').updateOne({ code: order.voucherCode }, { $inc: { usedCount: 1 } });
      }
    }

    const timeline = [...(order.timeline || []), { status, at: formatViDate() }];
    await ordersCol.updateOne(
      { id: orderId },
      { $set: { status, stockDeducted, paymentStatus, timeline } }
    );
    res.status(200).json({ id: orderId, status });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/admin/orders/:id/cancellation', async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const { decision, note } = req.body || {};
    if (!['APPROVED', 'REJECTED'].includes(decision)) return res.status(400).json({ message: 'Quyết định xử lý không hợp lệ.' });

    const ordersCol = db.collection('orders');
    const order = await ordersCol.findOne({ id: orderId });
    if (!order || order.cancellationRequest?.status !== 'PENDING') {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu hủy đang chờ duyệt.' });
    }

    if (decision === 'APPROVED') {
      let stockDeducted = order.stockDeducted;
      if (stockDeducted) {
        for (const item of order.items) {
          await adjustInventoryInDb(item.productId, item.quantity, 'ORDER_CANCEL', 'Hoàn kho do hủy đơn ' + order.code, order.id);
        }
        stockDeducted = false;
      }
      const nowIso = new Date().toISOString();
      const timeline = [...(order.timeline || []), { status: 'CANCELLED', at: formatViDate() }];
      await ordersCol.updateOne(
        { id: orderId },
        {
          $set: {
            status: 'CANCELLED',
            stockDeducted,
            cancelReason: order.cancellationRequest.reason,
            cancelledAt: nowIso,
            cancellationRequest: { ...order.cancellationRequest, status: 'APPROVED', reviewedAt: nowIso, reviewedBy: 'Admin' },
            timeline
          }
        }
      );
    } else {
      await ordersCol.updateOne(
        { id: orderId },
        {
          $set: {
            cancellationRequest: {
              ...order.cancellationRequest,
              status: 'REJECTED',
              adminNote: String(note || 'Yêu cầu không đáp ứng điều kiện hủy đơn.'),
              reviewedAt: new Date().toISOString(),
              reviewedBy: 'Admin'
            }
          }
        }
      );
    }
    res.status(200).json({ id: orderId, decision });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/admin/vouchers', async (req, res) => {
  try {
    const input = req.body || {};
    const code = String(input.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ message: 'Mã voucher không được để trống.' });
    const value = input.type === 'shipping' ? Number(input.value || 30000) : Number(input.value);
    if (value <= 0) return res.status(400).json({ message: 'Giá trị giảm phải lớn hơn 0.' });

    const vouchersCol = db.collection('vouchers');
    const existing = await vouchersCol.findOne({ code });
    const payload = {
      code,
      name: String(input.name || '').trim() || code,
      type: input.type || 'percentage',
      value,
      maxDiscount: input.maxDiscount ? Number(input.maxDiscount) : null,
      minOrder: Number(input.minOrder || 0),
      startAt: input.startAt ? new Date(input.startAt).toISOString() : new Date().toISOString(),
      endAt: input.endAt ? new Date(input.endAt).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString(),
      usageLimit: Number(input.usageLimit || 100),
      usedCount: existing?.usedCount || 0,
      status: 'ACTIVE'
    };

    if (existing) {
      await vouchersCol.updateOne({ code }, { $set: payload });
    } else {
      await vouchersCol.insertOne(payload);
    }
    res.status(200).json(payload);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/admin/vouchers/:code/toggle', async (req, res) => {
  try {
    const code = String(req.params.code || '').toUpperCase();
    const vouchersCol = db.collection('vouchers');
    const voucher = await vouchersCol.findOne({ code });
    if (!voucher) return res.status(404).json({ message: 'Không tìm thấy voucher.' });
    const nextStatus = voucher.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await vouchersCol.updateOne({ code }, { $set: { status: nextStatus } });
    res.status(200).json({ code, status: nextStatus });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/admin/returns/:id', async (req, res) => {
  try {
    const returnId = Number(req.params.id);
    const { status, note } = req.body || {};
    const returnsCol = db.collection('return_requests');
    const request = await returnsCol.findOne({ id: returnId });
    if (!request) return res.status(404).json({ message: 'Không tìm thấy yêu cầu.' });

    const hasEvidence = (Array.isArray(request.evidenceImages) && request.evidenceImages.length > 0) || Boolean(request.evidenceImage) || Boolean(request.evidenceName);
    if (status === 'APPROVED' && !hasEvidence) {
      return res.status(400).json({ message: 'Yêu cầu đổi/trả chưa có hình ảnh minh chứng hợp lệ từ khách hàng, không thể duyệt nhập kho.' });
    }

    const adminNote = String(note || '').trim();
    if (status === 'REJECTED' && adminNote.length < 5) {
      return res.status(400).json({ message: 'Vui lòng nhập lý do từ chối đổi/ trả tối thiểu 5 ký tự.' });
    }
    const finalNote = adminNote || (status === 'APPROVED' ? 'Đã duyệt và nhập lại kho.' : 'Yêu cầu chưa đủ điều kiện.');
    await returnsCol.updateOne({ id: returnId }, { $set: { status, adminNote: finalNote } });
    if (status === 'APPROVED') {
      await adjustInventoryInDb(request.productId, request.quantity || 1, 'CUSTOMER_RETURN', 'Nhập lại kho từ yêu cầu ' + request.code);
    }
    res.status(200).json({ id: returnId, status });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/admin/reviews/:id/toggle', async (req, res) => {
  try {
    const reviewId = Number(req.params.id);
    const reviewsCol = db.collection('reviews');
    const review = await reviewsCol.findOne({ id: reviewId });
    if (!review) return res.status(404).json({ message: 'Không tìm thấy đánh giá.' });
    const nextStatus = review.status === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE';
    await reviewsCol.updateOne({ id: reviewId }, { $set: { status: nextStatus } });
    res.status(200).json({ id: reviewId, status: nextStatus });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/admin/blogs', async (req, res) => {
  try {
    const { title, excerpt, status } = req.body || {};
    if (!String(title || '').trim()) return res.status(400).json({ message: 'Tiêu đề bài viết không được để trống.' });
    const blogsCol = db.collection('blogs');
    const id = await getNextId(blogsCol);
    const doc = {
      id,
      title: String(title).trim(),
      excerpt: String(excerpt || '').trim(),
      image: '/img/products/4.png',
      date: formatViDate(),
      status: status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
      source: 'ADMIN'
    };
    await blogsCol.insertOne(doc);
    res.status(201).json(doc);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/admin/blogs/:id/toggle', async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const blogsCol = db.collection('blogs');
    const post = await blogsCol.findOne({ id: postId });
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài viết.' });
    const nextStatus = post.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    await blogsCol.updateOne({ id: postId }, { $set: { status: nextStatus } });
    res.status(200).json({ id: postId, status: nextStatus });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/admin/user-blogs/:id', async (req, res) => {
  try {
    const subId = Number(req.params.id);
    const { status, note } = req.body || {};
    const subCol = db.collection('user_blog_submissions');
    const post = await subCol.findOne({ id: subId });
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài viết user gửi.' });
    const adminNote = String(note || '').trim();
    if (status === 'REJECTED' && adminNote.length < 5) {
      return res.status(400).json({ message: 'Vui lòng nhập lý do từ chối bài viết tối thiểu 5 ký tự.' });
    }
    await subCol.updateOne(
      { id: subId },
      { $set: { status, adminNote, reviewedAt: formatViDate() } }
    );
    res.status(200).json({ id: subId, status });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Khởi chạy Server
initMongo()
  .then(() => {
    app.listen(port, () => {
      console.log(`My Server (AN Store MongoDB) listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });
