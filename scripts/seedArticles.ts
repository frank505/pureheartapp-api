import 'dotenv/config';
import { sequelize } from '../src/config/database';
import Article from '../src/models/Article';
import ARTICLES from '../src/data/articles';

/**
 * Seeds (or top-ups) the articles table. It only inserts new articles
 * when the in-memory source list length exceeds current DB count.
 *
 * Usage: npm run seed:articles
 */
async function run() {
  try {
    await sequelize.authenticate();
    await Article.sync(); // ensure table exists (non-destructive with existing structure)

    const existingCount = await Article.count();
    if (existingCount >= ARTICLES.length) {
      console.log(`No new articles to insert. Existing: ${existingCount}, Source: ${ARTICLES.length}`);
      process.exit(0);
    }

    const newOnes = ARTICLES.slice(existingCount);
    await Article.bulkCreate(
      newOnes.map(a => ({
        slug: a.slug,
        title: a.title,
        summary: a.summary,
        content: a.content,
        references: a.references,
        tags: a.tags,
        category: a.category,
      })),
      { validate: true }
    );

    console.log(`Inserted ${newOnes.length} new article(s). Total is now ${existingCount + newOnes.length}.`);
  } catch (err) {
    console.error('Error seeding articles:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
