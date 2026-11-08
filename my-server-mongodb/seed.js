const { seedDatabase } = require('./scripts/seed');

if (require.main === module) {
  seedDatabase(true)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed Error]', err);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
