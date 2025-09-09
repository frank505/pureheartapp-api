import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import redis from '@fastify/redis';
import fastifyStatic from '@fastify/static';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import { serverConfig, jwtConfig, appConfig } from './config/environment';
import { getRedisOptions, RedisUtils, checkRedisHealth } from './config/redis';
import { testDatabaseConnection, syncAllModels, closeDatabaseConnection } from './config/database';
import { initializeQueueSystem, queueManager, checkQueueHealth } from './config/queue';
import { initializeEmailWorker, closeEmailWorker } from './jobs/emailJobs';
import authRoutes from './routes/auth';
import inviteRoutes from './routes/invite';
import groupRoutes from './routes/groups';
import { initializeNotificationWorker } from './jobs/notificationJobs';
import { IAPIResponse } from './types/auth';
import path from 'path';
import { initializeGeneralSettings } from './config/settings';
import settingsRoutes from './routes/settings';
import notificationsRoutes from './routes/notifications';
import accountabilityRoutes from './routes/accountability';
import recommendationsRoutes from './routes/recommendations';
import { initializeRecommendationWorker, scheduleDailyRecommendations } from './jobs/recommendationJobs';
import { initializeReflectionWorker, scheduleWeeklyReflections } from './jobs/reflectionJobs';
import { initializeTruthLiesWorker, closeTruthLiesWorker } from './jobs/truthLiesJobs';
import progressRoutes from './routes/progress';
import truthLiesRoutes from './routes/truthLies';
import { initializeDefaultAchievements } from './config/achievements';
import { initializeDefaultBadges } from './config/badges';
import aiChatRoutes from './routes/aichat';
import breatheRoutes from './routes/breathe';
import fastRoutes from './routes/fasts';
import widgetRoutes from './routes/widget';
import { scheduleFastingCron, initializeFastingWorker } from './jobs/fastingJobs';
import devicesRoutes from './routes/devices';
import { initFirebaseIfNeeded } from './services/pushService';
import waitingListRoutes from './routes/waitingList';
import reflectionsRoutes from './routes/reflections';
import userFirstsRoutes from './routes/userFirsts';
import panicRoutes from './routes/panic';
// Ensure new models are registered before syncing
import './models/UserAchievement';
import './models/UserProgress';
import './models/AIChatSession';
import './models/AIChatMessage';
import './models/Badge';
import './models/UserBadge';
import './models/index';
import './models/Fast';
import './models/FastPrayerLog';
import './models/FastProgressLog';
import './models/FastReminderLog';
import './models/FastJournal';
import './models/FastMessage';
import './models/Panic';
import './models/PanicReply';

/**
 * Create and configure Fastify server instance
 * This function sets up all plugins, middleware, and routes for the application
 */
const createServer = async (): Promise<FastifyInstance> => {
  // Create Fastify instance with logging configuration
  const fastify = Fastify({
    logger: serverConfig.NODE_ENV === 'development' ? {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        }
      }
    } : {
      level: 'warn'
    }
  });

  // Register security plugin (helmet) - must be first for security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for API usage
  });

  // Register CORS plugin
  await fastify.register(cors, {
    origin: serverConfig.NODE_ENV === 'production' 
      ? [appConfig.frontendUrl] // Only allow frontend URL in production
      : true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Register JWT plugin
  await fastify.register(jwt, {
    secret: jwtConfig.secret,
  });

  // Register Redis plugin
  await fastify.register(redis, getRedisOptions());

  // Register static file serving (for health check assets, etc.)
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '..', 'public'),
    prefix: '/public/',
  });

  // Serve 1-minute ASMR clips
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '1min_clips'),
    prefix: '/audio/1min/',
    decorateReply: false,
    serve: true,
  } as any);

  // Add Redis utilities to Fastify instance
  fastify.decorate('redisUtils', new RedisUtils(fastify.redis));

  // Initialize queue system
  initializeQueueSystem();
  
  // Initialize all workers concurrently
  await Promise.allSettled([
    Promise.resolve().then(() => initializeEmailWorker()),
    Promise.resolve().then(() => initializeNotificationWorker()),
    Promise.resolve().then(() => initializeRecommendationWorker()),
  Promise.resolve().then(() => initializeReflectionWorker()),
    Promise.resolve().then(() => initializeTruthLiesWorker()),
    Promise.resolve().then(() => initFirebaseIfNeeded()),
    Promise.resolve().then(() => initializeFastingWorker()),
  ]);

  // Schedule recurring jobs in parallel
  await Promise.allSettled([
    Promise.resolve().then(() => scheduleDailyRecommendations()),
  Promise.resolve().then(() => scheduleWeeklyReflections()),
    Promise.resolve().then(() => scheduleFastingCron()),
  ]);

  // Set up Bull Dashboard for queue monitoring
  const serverAdapter = new FastifyAdapter();
  serverAdapter.setBasePath('/admin/queues');

  const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
    queues: queueManager.getAllQueues().map(queue => new BullMQAdapter(queue)),
    serverAdapter,
  });

  // Register Bull Dashboard
  await fastify.register(serverAdapter.registerPlugin(), {
    prefix: '/admin/queues',
    basePath: '/admin/queues',
  });

  // Add global error handler
  fastify.setErrorHandler(async (error, request, reply) => {
    fastify.log.error(error);

    // Handle validation errors
    if (error.validation) {
      const response: IAPIResponse = {
        success: false,
        message: 'Validation failed',
        error: 'Invalid input data',
        statusCode: 400,
        data: {
          validationErrors: error.validation
        }
      };
      return reply.status(400).send(response);
    }

    // Handle JWT errors
    if (error.message.includes('jwt') || error.message.includes('token')) {
      const response: IAPIResponse = {
        success: false,
        message: 'Authentication failed',
        error: error.message,
        statusCode: 401,
      };
      return reply.status(401).send(response);
    }

    // Handle database errors
    if (error.name === 'SequelizeError') {
      const response: IAPIResponse = {
        success: false,
        message: 'Database error occurred',
        error: serverConfig.NODE_ENV === 'development' ? error.message : 'Internal server error',
        statusCode: 500,
      };
      return reply.status(500).send(response);
    }

    // Handle rate limiting errors
    if (error.statusCode === 429) {
      const response: IAPIResponse = {
        success: false,
        message: 'Too many requests',
        error: 'Rate limit exceeded',
        statusCode: 429,
      };
      return reply.status(429).send(response);
    }

    // Default error response
    const statusCode = error.statusCode || 500;
    const response: IAPIResponse = {
      success: false,
      message: statusCode === 500 ? 'Internal server error' : error.message,
      error: serverConfig.NODE_ENV === 'development' ? error.message : 'Something went wrong',
      statusCode,
    };

    return reply.status(statusCode).send(response);
  });

  // Add global not found handler
  fastify.setNotFoundHandler(async (request, reply) => {
    const response: IAPIResponse = {
      success: false,
      message: 'Route not found',
      error: `Cannot ${request.method} ${request.url}`,
      statusCode: 404,
    };
    return reply.status(404).send(response);
  });

  // Health check endpoint
  fastify.get('/health', async (request, reply) => {
    const health = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: serverConfig.NODE_ENV,
      version: '1.0.0',
      services: {
        database: false,
        redis: false,
        queues: false,
      }
    };

    try {
      // Check database connection
      await testDatabaseConnection();
      health.services.database = true;
    } catch (error) {
      fastify.log.error('Database health check failed:', error);
    }

    try {
      // Check Redis connection
      health.services.redis = await checkRedisHealth(fastify.redis);
    } catch (error) {
      fastify.log.error('Redis health check failed:', error);
    }

    try {
      // Check queue system health
      const queueHealth = await checkQueueHealth();
      health.services.queues = queueHealth.status === 'healthy';
    } catch (error) {
      fastify.log.error('Queue health check failed:', error);
    }

    const allServicesHealthy = health.services.database && health.services.redis && health.services.queues;
    const statusCode = allServicesHealthy ? 200 : 503;
    const response: IAPIResponse = {
      success: statusCode === 200,
      message: statusCode === 200 ? 'Service is healthy' : 'Service is unhealthy',
      data: health,
      statusCode,
    };

    return reply.status(statusCode).send(response);
  });

  // API information endpoint
  fastify.get('/', async (request, reply) => {
    const response: IAPIResponse = {
      success: true,
      message: 'Welcome to Christian Recovery App API',
      data: {
        name: appConfig.name,
        version: '1.0.0',
        environment: serverConfig.NODE_ENV,
        endpoints: {
          health: '/health',
          auth: '/api/auth',
          invite: '/api/invite',
          queues: '/admin/queues', // Bull Dashboard for queue monitoring
          docs: '/docs' // If you add API documentation later
        }
      },
      statusCode: 200,
    };

    return reply.status(200).send(response);
  });

  // Register route handlers
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(inviteRoutes, { prefix: '/api' });
  await fastify.register(groupRoutes, { prefix: '/api' });
  await fastify.register(settingsRoutes, { prefix: '/api' });
  await fastify.register(notificationsRoutes, { prefix: '/api' });
  await fastify.register(accountabilityRoutes, { prefix: '/api/accountability' });
  await fastify.register(recommendationsRoutes, { prefix: '/api' });
  await fastify.register(progressRoutes, { prefix: '/api' });
  await fastify.register(truthLiesRoutes, { prefix: '/api' });
  await fastify.register(aiChatRoutes, { prefix: '/api' });
  await fastify.register(breatheRoutes, { prefix: '/api' });
  await fastify.register(fastRoutes, { prefix: '/api' });
  await fastify.register(widgetRoutes, { prefix: '/api' });
  await fastify.register(devicesRoutes, { prefix: '/api' });
  await fastify.register(waitingListRoutes, { prefix: '/api' });
  await fastify.register(reflectionsRoutes, { prefix: '/api' });
  await fastify.register(userFirstsRoutes, { prefix: '/api' });
  await fastify.register(panicRoutes, { prefix: '/api' });

  // Add graceful shutdown hooks
  const gracefulCloseHandler = {
    closePromises: [] as Promise<void>[],
    closePromiseHandler: async () => {
      fastify.log.info('Received kill signal, shutting down gracefully...');
      
      try {
        // Close email worker
        await closeEmailWorker();
        fastify.log.info('Email worker closed');
        
        // Close truth/lies worker
        await closeTruthLiesWorker();
        fastify.log.info('Truth/Lies worker closed');
        
        // Close queue system
        await queueManager.closeAll();
        fastify.log.info('Queue system closed');
        
        // Close database connection
        await closeDatabaseConnection();
        fastify.log.info('Database connection closed');
        
        // Close Redis connection
        if (fastify.redis) {
          await fastify.redis.quit();
          fastify.log.info('Redis connection closed');
        }
        
        // Close Fastify server
        await fastify.close();
        fastify.log.info('Fastify server closed');
        
        process.exit(0);
      } catch (error) {
        fastify.log.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    }
  };

  // Register shutdown handlers
  process.on('SIGTERM', gracefulCloseHandler.closePromiseHandler);
  process.on('SIGINT', gracefulCloseHandler.closePromiseHandler);

  return fastify;
};

/**
 * Start the server
 * This function creates the server instance and starts listening on the specified port
 */
const startServer = async (): Promise<void> => {
  try {
    // Test database connection first
    await testDatabaseConnection();
    
    // In development, you might want to use `alter: true` to avoid losing data
    // In production, you'll likely want to use a migration tool instead.
  // Avoid auto-altering schema in dev to prevent repeated index churn
  await syncAllModels(false, false);
    // Initialize default general settings
    await initializeGeneralSettings();
    // Seed default achievements
    await initializeDefaultAchievements();
  // Seed default badges
  await initializeDefaultBadges();
    
    // Create and start the server
    const fastify = await createServer();
    
    await fastify.listen({
      port: serverConfig.PORT,
      host: serverConfig.HOST
    });

    fastify.log.info(`🚀 Server is running on ${serverConfig.HOST}:${serverConfig.PORT}`);
    fastify.log.info(`📚 Environment: ${serverConfig.NODE_ENV}`);
    fastify.log.info(`💾 Database connected successfully`);
    fastify.log.info(`⚡ Redis connected successfully`);
    fastify.log.info(`📬 Queue system initialized`);
    fastify.log.info(`📊 Queue dashboard available at http://localhost:${serverConfig.PORT}/admin/queues`);
    fastify.log.info(`🔐 JWT authentication enabled`);
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

export { createServer, startServer };
export default createServer;