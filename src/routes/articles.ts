import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import Article from '../models/Article';
import { Op, WhereOptions } from 'sequelize';

interface ListQuery {
  page?: string | number;
  limit?: string | number;
  search?: string; // legacy support
  q?: string; // new multi-field search
  category?: string;
  tag?: string;
  sort?: 'newest' | 'oldest' | 'title';
}

export default async function articlesRoutes(fastify: FastifyInstance) {
  // GET /api/articles - paginated, titles/summaries only
  fastify.get('/articles', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = '1', limit = '20', search, q, category, tag, sort = 'newest' } = (request.query as ListQuery) || {};

    const currentPage = Math.max(parseInt(String(page), 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 50);
    const offset = (currentPage - 1) * pageSize;

    const where: WhereOptions = {};
    if (category) (where as any).category = category;

    const dialect = Article.sequelize!.getDialect();
    const likeOp = dialect === 'mysql' ? Op.like : Op.iLike;

    const queryTerm = q || search; // support both param names
    if (queryTerm) {
      // Multi-field OR search (title, summary, content, tags JSON string)
      (where as any)[Op.or] = [
        { title: { [likeOp]: `%${queryTerm}%` } },
        { summary: { [likeOp]: `%${queryTerm}%` } },
        { content: { [likeOp]: `%${queryTerm}%` } },
      ];
    }

    // Simple tag filter (tags stored as JSON array)
    if (tag) {
      // MySQL JSON_SEARCH approach could be used; for portability we'll fetch then filter if dialect isn't MySQL.
    }

    let order: any[] = [];
    switch (sort) {
      case 'oldest':
        order = [['createdAt', 'ASC']];
        break;
      case 'title':
        order = [['title', 'ASC']];
        break;
      default:
        order = [['createdAt', 'DESC']];
    }

    const { rows, count } = await Article.findAndCountAll({
      where,
      attributes: ['id', 'slug', 'title', 'summary', 'category', 'tags', 'createdAt'],
      order,
      limit: pageSize,
      offset,
    });

    let items = rows.map(r => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      summary: r.summary ?? undefined,
      category: r.category ?? undefined,
      tags: r.getDataValue('tags') || undefined,
      createdAt: r.createdAt?.toISOString(),
    }));

    if (tag) {
      items = items.filter(i => Array.isArray(i.tags) && i.tags.includes(tag));
    }

    return reply.send({
      success: true,
      message: 'Articles list',
      statusCode: 200,
      data: {
        items,
        page: currentPage,
        totalPages: Math.ceil(count / pageSize) || 1,
        total: count,
        pageSize,
        appliedFilters: { q: queryTerm || undefined, category: category || undefined, tag: tag || undefined, sort }
      },
    });
  });

  // GET /api/articles/:slug - full article
  fastify.get('/articles/:slug', async (request: FastifyRequest, reply: FastifyReply) => {
    const { slug } = request.params as { slug: string };
    if (!slug) return reply.status(400).send({ success: false, message: 'Slug required', statusCode: 400 });

    const article = await Article.findOne({ where: { slug } });
    if (!article) return reply.status(404).send({ success: false, message: 'Article not found', statusCode: 404 });

    return reply.send({
      success: true,
      message: 'Article retrieved',
      statusCode: 200,
      data: {
        id: article.id,
        slug: article.slug,
        title: article.title,
        summary: article.summary ?? undefined,
        content: article.content,
        references: article.getDataValue('references') || [],
        tags: article.getDataValue('tags') || undefined,
        category: article.category ?? undefined,
        version: article.getDataValue('version'),
        createdAt: article.createdAt?.toISOString(),
        updatedAt: article.updatedAt?.toISOString(),
      }
    });
  });
}
