# ĐỒ ÁN WEB 2: HỆ THỐNG WEBSITE BOARDGAME "ẨN: MẬT ÁN LỆ CHI VIÊN"

Dự án website thương mại điện tử chuyên biệt cho Board game trinh thám lịch sử Việt Nam, xây dựng trên nền tảng **Angular 18**, **Node.js/Express** và **MongoDB**.

---

## 🏛️ 1. Cấu Trúc Dự Án
```text
├── my-app/                # Giao diện người dùng Single Page Application (Angular 18)
├── my-server-mongodb/     # Máy chủ RESTful API & Xác thực JWT (Node.js + Express + MongoDB)
├── database-backup/       # Sao lưu dữ liệu CSDL MongoDB (14 collections JSON & script khôi phục)
├── .gitignore             # Danh mục loại trừ node_modules, build artifacts
└── README.md              # Hướng dẫn triển khai dự án
```

---

## ⚙️ 2. Công Nghệ Sử Dụng
- **Frontend:** Angular 18, TypeScript, RxJS, HTML5/CSS3 (Hệ màu Cổ phong Hoàng tộc Đại Việt).
- **Backend:** Node.js, Express.js, JWT Authentication, Multer (xử lý tải ảnh minh chứng đổi trả), CORS.
- **Cơ sở dữ liệu:** MongoDB (`AnBoardGameData`), 14 Collections độc lập.
- **Tính năng nổi bật:**
  - Trang chủ phân khu theo mạch cốt truyện (Cốt truyện -> Phòng án mô phỏng -> 5 Hồ sơ nhân vật -> Cách chơi -> Tàng thư).
  - Quy trình Đổi/Trả hàng bắt buộc có ảnh chụp bằng chứng (Client & Admin).
  - Khám nghiệm vật phẩm & Xoay mô hình 3D tương tác.
  - Sổ địa chỉ giao hàng, Voucher ưu đãi, Giỏ hàng nổi & Đặt hàng vãng lai OTP.
  - Biên bản lưu trữ (Blog án văn) tích hợp bộ lọc từ ngữ thô tục.
  - Phân hệ Quản trị (Admin) toàn diện với Dashboard KPI, Doanh thu, Quản lý kho, Duyệt đổi trả.

---

## 🚀 3. Hướng Dẫn Cài Đặt & Chạy Dự Án

### Yêu cầu hệ thống:
- [Node.js](https://nodejs.org/) (phiên bản v18 trở lên)
- [MongoDB Community Server](https://www.mongodb.com/try/download/community) đang chạy tại `mongodb://127.0.0.1:27017`

---

### Bước 1: Khôi phục Cơ sở dữ liệu MongoDB
Chạy lệnh sau từ thư mục gốc để nạp dữ liệu 14 collections vào database `AnBoardGameData`:
```bash
node database-backup/restore-database.js
```

---

### Bước 2: Khởi động Backend Server
```bash
cd my-server-mongodb
npm install
npm start
```
> Server sẽ lắng nghe tại: `http://localhost:3002`

---

### Bước 3: Khởi động Frontend Client
Mở một cửa sổ Terminal mới:
```bash
cd my-app
npm install
npm start
```
> Truy cập website tại: `http://localhost:4200`

---

## 👥 Tài khoản thử nghiệm:
- **Khách hàng:** Số điện thoại `0704477397` (Hoàng Lan) / Mật khẩu: `123456`
- **Quản trị viên (Admin):** Tài khoản `admin` / Mật khẩu: `admin123`
