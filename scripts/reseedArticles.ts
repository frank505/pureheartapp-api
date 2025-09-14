/**
 * One-off reseed script for Articles.
 * WARNING: This will TRUNCATE the `articles` table and reinsert ALL current in-memory ARTICLES.
 * Run manually: npm run reseed:articles
 * Do NOT wire this into production startup logic.
 */
import 'dotenv/config';
import sequelize from '../src/config/database';
import Article from '../src/models/Article';
import ARTICLES from '../src/data/articles';

async function reseed() {
  console.log('⚠️  Reseed starting: truncating `articles` and reinserting fresh content...');
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection ok');

    // Use transaction for safety
    await sequelize.transaction(async (t) => {
      // Truncate (resets auto increment). cascade helps if FKs exist (currently none reference Article).
      await Article.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true, transaction: t as any });
      console.log('🧹 Table truncated');

      const payload = ARTICLES.map(a => ({
        slug: a.slug,
        title: a.title,
        summary: a.summary ?? null,
        content: a.content,
        references: a.references ?? null,
        tags: a.tags ?? null,
        category: a.category ?? null,
        version: 1,
      }));

      await Article.bulkCreate(payload, { validate: true, transaction: t });
      console.log(`✅ Inserted ${payload.length} articles`);
    });

    console.log('🎉 Reseed complete.');
  } catch (err) {
    console.error('❌ Reseed failed:', err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

reseed();
