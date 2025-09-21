import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { httpLogger } from '../config/logger';

export interface RequestLogData {
  timestamp: string;
  method: string;
  url: string;
  ip: string;
  userAgent: string;
  headers: Record<string, any>;
  query: Record<string, any>;
  params: Record<string, any>;
  body: any;
  statusCode?: number;
  responseTime?: number;
  contentLength?: number;
  userId?: string;
  error?: string;
  requestId: string;
}

export const registerHttpLogging = (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store start time and request ID
    (request as any).startTime = Date.now();
    (request as any).requestId = requestId;
    
    // Add request ID to headers for tracing
    request.headers['x-request-id'] = requestId;
  });

  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const endTime = Date.now();
    const startTime = (request as any).startTime;
    const requestId = (request as any).requestId;
    const responseTime = endTime - startTime;

    const logData: RequestLogData = {
      requestId,
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent'] || 'Unknown',
      headers: sanitizeHeaders(request.headers),
      query: { ...request.query as any },
      params: { ...request.params as any },
      body: sanitizeBody(request.body),
      statusCode: reply.statusCode,
      responseTime,
    };

    // Add user ID if available
    if ((request as any).user?.id) {
      logData.userId = (request as any).user.id;
    }

    // Log the request
    httpLogger.http('API Request', logData);
  });

  fastify.addHook('onError', async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
    const endTime = Date.now();
    const startTime = (request as any).startTime;
    const requestId = (request as any).requestId;
    const responseTime = endTime - startTime;

    const errorLogData: RequestLogData = {
      requestId,
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent'] || 'Unknown',
      headers: sanitizeHeaders(request.headers),
      query: { ...request.query as any },
      params: { ...request.params as any },
      body: sanitizeBody(request.body),
      statusCode: reply.statusCode || 500,
      responseTime,
      error: error.message,
    };

    if ((request as any).user?.id) {
      errorLogData.userId = (request as any).user.id;
    }

    httpLogger.error('API Request Error', errorLogData);
  });
};

function sanitizeHeaders(headers: any): Record<string, any> {
  const sanitized = { ...headers };
  delete sanitized.authorization;
  delete sanitized.cookie;
  return sanitized;
}

function sanitizeBody(body: any): any {
  if (!body) return null;
  
  const sanitized = JSON.parse(JSON.stringify(body));
  
  // Remove password fields
  if (sanitized.password) delete sanitized.password;
  if (sanitized.confirmPassword) delete sanitized.confirmPassword;
  if (sanitized.oldPassword) delete sanitized.oldPassword;
  if (sanitized.newPassword) delete sanitized.newPassword;
  
  return sanitized;
}
