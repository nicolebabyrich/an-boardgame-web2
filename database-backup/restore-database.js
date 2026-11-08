// Script khoi phuc CSDL MongoDB cho do an AN: Mat An Le Chi Vien
// Chay lenh: node database-backup/restore-database.js
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('../my-server-mongodb/node_modules/mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'AnBoardGameData';

async function restore() {
  console.log(`[Khôi phục CSDL] Đang kết nối tới ${MONGO_URI}/${DB_NAME}...`);
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  const backupDir = __dirname;
  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const colName = path.basename(file, '.json');
    const content = fs.readFileSync(path.join(backupDir, file), 'utf-8');
    const docs = JSON.parse(content);

    if (Array.isArray(docs) && docs.length > 0) {
      await db.collection(colName).deleteMany({});
      await db.collection(colName).insertMany(docs);
      console.log(`✓ Đã nạp ${docs.length} bản ghi vào collection '${colName}'`);
    }
  }

  await client.close();
  console.log(`\n🎉 Đã hoàn tất phục hồi toàn bộ CSDL '${DB_NAME}' thành công!`);
}

restore().catch(err => {
  console.error('Lỗi phục hồi CSDL:', err);
  process.exit(1);
});
