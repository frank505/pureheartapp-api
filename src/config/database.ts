import { Sequelize } from 'sequelize';
import { databaseConfig, serverConfig } from './environment';

/**
 * Database connection configuration using Sequelize ORM
 * This sets up the MySQL connection with proper error handling and logging
 */

// Create Sequelize instance with MySQL configuration
export const sequelize = new Sequelize({
  dialect: 'mysql',
  host: databaseConfig.host,
  port: databaseConfig.port,
  database: databaseConfig.database,
  username: databaseConfig.username,
  password: databaseConfig.password,
  
  // Connection pool configuration for better performance
  pool: {
    max: 10,        // Maximum number of connections in pool
    min: 0,         // Minimum number of connections in pool
    acquire: 30000, // Maximum time in ms that pool will try to get connection before throwing error
    idle: 10000,    // Maximum time in ms that a connection can be idle before being released
  },

  // Logging configuration - disable in production for better performance
  logging: serverConfig.NODE_ENV === 'development' ? console.log : false,

  // Define charset and timezone
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    timestamps: true,           // Automatically add createdAt and updatedAt fields
    underscored: true,          // Use snake_case for database column names
    freezeTableName: true,      // Prevent Sequelize from pluralizing table names
    paranoid: true,             // Enable soft deletes (deletedAt field)
  },

  // Database-specific configurations
  dialectOptions: {
    charset: 'utf8mb4',
    timezone: '+00:00',         // Use UTC timezone
    supportBigNumbers: true,
    bigNumberStrings: true,
    
    // SSL configuration for production databases (if needed)
    ...(serverConfig.NODE_ENV === 'production' && {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    })
  },

  // Timezone configuration
  timezone: '+00:00'
});

/**
 * Test database connection
 * This function attempts to authenticate with the database
 */
export const testDatabaseConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

/**
 * Synchronize database models
 * This function creates/updates database tables based on model definitions
 * @param force - Whether to drop existing tables before creating new ones
 */
export const syncAllModels = async (force: boolean = false, alter: boolean = false): Promise<void> => {
  try {
    // The `alter: true` option checks the current state of the table in the database,
    // compares it to the model definition, and then performs the necessary changes
    // in the table to make it match the model.
    // Use `alter: true` in development to avoid losing data.
    // Use `force: true` only when you want to completely drop and re-create tables.
    await sequelize.sync({ force, alter });
    console.log('All models synchronized successfully');
  } catch (error) {
    console.error('Error synchronizing models:', error);
    throw error;
  }
};

/**
 * Close database connection gracefully
 * This should be called when the application is shutting down
 */
export const closeDatabaseConnection = async (): Promise<void> => {
  try {
    await sequelize.close();
    console.log('✅ Database connection has been closed.');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
    throw error;
  }
};

// Export the sequelize instance for use in models
export default sequelize;