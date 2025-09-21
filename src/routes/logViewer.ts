import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logViewerAuthMiddleware, AuthenticatedRequest } from '../middleware/logViewerAuth';
import { logViewerService, LogFilter } from '../services/logViewerService';
import path from 'path';
import fs from 'fs-extra';

interface LogsQueryParams {
  page?: string;
  limit?: string;
  level?: string;
  method?: string;
  statusCode?: string;
  fromDate?: string;
  toDate?: string;
  searchTerm?: string;
  userId?: string;
}

export default async function logViewerRoutes(fastify: FastifyInstance) {
  // Register authentication middleware for all log viewer routes
  fastify.addHook('preHandler', logViewerAuthMiddleware);

  // Serve the log viewer UI
  fastify.get('/', async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const htmlPath = path.join(__dirname, '../views/logViewer.html');
    
    if (await fs.pathExists(htmlPath)) {
      const html = await fs.readFile(htmlPath, 'utf-8');
      reply.type('text/html').send(html);
    } else {
      reply.status(404).send({ error: 'Log viewer UI not found' });
    }
  });

  // Get available log files
  fastify.get('/api/files', async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const files = await logViewerService.getAvailableLogFiles();
      reply.send({ files });
    } catch (error) {
      reply.status(500).send({ 
        error: 'Failed to retrieve log files', 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get logs from a specific file with pagination and filtering
  fastify.get<{ 
    Params: { filename: string }, 
    Querystring: LogsQueryParams 
  }>('/api/logs/:filename', async (request, reply) => {
    try {
      const { filename } = request.params;
      const {
        page = '1',
        limit = '50',
        level,
        method,
        statusCode,
        fromDate,
        toDate,
        searchTerm,
        userId
      } = request.query;

      const filters: LogFilter = {};
      if (level) filters.level = level;
      if (method) filters.method = method;
      if (statusCode) filters.statusCode = parseInt(statusCode);
      if (fromDate) filters.fromDate = fromDate;
      if (toDate) filters.toDate = toDate;
      if (searchTerm) filters.searchTerm = searchTerm;
      if (userId) filters.userId = userId;

      const result = await logViewerService.readLogFile(
        filename,
        parseInt(page),
        parseInt(limit),
        filters
      );

      reply.send(result);
    } catch (error) {
      reply.status(500).send({ 
        error: 'Failed to retrieve logs', 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get statistics for a log file
  fastify.get<{ Params: { filename: string } }>('/api/stats/:filename', async (request, reply) => {
    try {
      const { filename } = request.params;
      const stats = await logViewerService.getLogStats(filename);
      reply.send(stats);
    } catch (error) {
      reply.status(500).send({ 
        error: 'Failed to retrieve log statistics', 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Stream live logs (latest entries)
  fastify.get<{ Params: { filename: string } }>('/api/live/:filename', async (request, reply) => {
    try {
      const { filename } = request.params;
      
      // Get the latest 20 log entries
      const result = await logViewerService.readLogFile(filename, 1, 20);
      
      reply.send({
        logs: result.logs,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      reply.status(500).send({ 
        error: 'Failed to retrieve live logs', 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Export logs as JSON
  fastify.get<{ 
    Params: { filename: string }, 
    Querystring: LogsQueryParams 
  }>('/api/export/:filename', async (request, reply) => {
    try {
      const { filename } = request.params;
      const {
        level,
        method,
        statusCode,
        fromDate,
        toDate,
        searchTerm,
        userId
      } = request.query;

      const filters: LogFilter = {};
      if (level) filters.level = level;
      if (method) filters.method = method;
      if (statusCode) filters.statusCode = parseInt(statusCode);
      if (fromDate) filters.fromDate = fromDate;
      if (toDate) filters.toDate = toDate;
      if (searchTerm) filters.searchTerm = searchTerm;
      if (userId) filters.userId = userId;

      // Get all logs without pagination for export
      const result = await logViewerService.readLogFile(filename, 1, 10000, filters);
      
      const exportData = {
        exportedAt: new Date().toISOString(),
        filename,
        filters,
        totalLogs: result.total,
        logs: result.logs
      };

      reply
        .header('Content-Disposition', `attachment; filename="logs-${filename}-${Date.now()}.json"`)
        .header('Content-Type', 'application/json')
        .send(exportData);
    } catch (error) {
      reply.status(500).send({ 
        error: 'Failed to export logs', 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
