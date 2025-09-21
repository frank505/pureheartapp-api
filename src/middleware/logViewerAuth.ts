import { FastifyRequest, FastifyReply } from 'fastify';
import basicAuth from 'basic-auth';

const LOG_VIEWER_CREDENTIALS = {
  username: 'root',
  password: 'password'
};

export interface AuthenticatedRequest extends FastifyRequest {
  logViewerAuth?: boolean;
}

export const logViewerAuthMiddleware = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  try {
    const credentials = basicAuth(request.raw);

    if (!credentials || 
        credentials.name !== LOG_VIEWER_CREDENTIALS.username || 
        credentials.pass !== LOG_VIEWER_CREDENTIALS.password) {
      
      reply.header('WWW-Authenticate', 'Basic realm="Log Viewer"');
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Valid credentials are required to access the log viewer'
      });
    }

    // Mark request as authenticated for log viewer
    request.logViewerAuth = true;
  } catch (error) {
    reply.header('WWW-Authenticate', 'Basic realm="Log Viewer"');
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid authentication format'
    });
  }
};
