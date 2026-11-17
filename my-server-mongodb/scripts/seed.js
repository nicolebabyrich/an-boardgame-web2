require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { MongoClient } = require('mongodb');
const seedData = require('../seed-data');

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const dbName = process.env.DB_NAME || 'AnBoardGameData';

async function seedDatabase(forceReset = true) {
  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const db = client.db(dbName);
    console.log(`[MongoDB] Connected to ${mongoUri} -> Database: '${dbName}'`);

    const collections = [
      ['categories', seedData.categories],
      ['products', seedData.products],
      ['vouchers', seedData.vouchers],
      ['blogs', seedData.blogPosts],
      ['admins', seedData.admins],
      ['users', seedData.users],
      ['addresses', seedData.addresses],
      ['orders', seedData.orders],
      ['reviews', seedData.reviews],
      ['inventory_transactions', seedData.inventoryTransactions],
      ['return_requests', seedData.returnRequests],
      ['user_blog_submissions', seedData.userBlogSubmissions],
      ['invoices', seedData.invoices],
      ['advisor_tickets', seedData.advisorTickets || []],
      ['password_resets', []]
    ];

    for (const [name, docs] of collections) {
      const col = db.collection(name);
      const count = await col.countDocuments();
      if (forceReset || count === 0) {
        await col.deleteMany({});
        if (docs.length > 0) {
          await col.insertMany(JSON.parse(JSON.stringify(docs)));
        }
        console.log(`[Seed] Collection '${name}': ${docs.length} documents inserted directly into MongoDB.`);
      } else {
        console.log(`[Seed] Collection '${name}': ${count} documents already exist (skipped).`);
      }
    }

    console.log(`[Seed] Database '${dbName}' on MongoDB (${mongoUri}) is ready!`);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  seedDatabase(true)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed Error]', err);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
