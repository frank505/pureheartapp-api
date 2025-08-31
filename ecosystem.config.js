module.exports = {
  apps: [{
    name: 'christian-recovery-app',
    script: './dist/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3036
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 3036,
      HOST: process.env.HOST || '0.0.0.0',
      
      // Database Configuration
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_NAME: process.env.DB_NAME,
      DB_USER: process.env.DB_USER,
      DB_PASSWORD: process.env.DB_PASSWORD,
      
      // Redis Configuration
      REDIS_HOST: process.env.REDIS_HOST,
      REDIS_PORT: process.env.REDIS_PORT,
      REDIS_PASSWORD: process.env.REDIS_PASSWORD,
      
      // JWT Configuration
      JWT_SECRET: process.env.JWT_SECRET,
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
      JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,
      
      // Email Configuration
      EMAIL_HOST: process.env.EMAIL_HOST,
      EMAIL_PORT: process.env.EMAIL_PORT,
      EMAIL_SECURE: process.env.EMAIL_SECURE,
      EMAIL_USER: process.env.EMAIL_USER,
      EMAIL_PASS: process.env.EMAIL_PASS,
      EMAIL_FROM: process.env.EMAIL_FROM,
      
      // Application Configuration
      APP_NAME: process.env.APP_NAME,
      APP_URL: process.env.APP_URL,
      API_URL: process.env.API_URL,
      FRONTEND_URL: process.env.FRONTEND_URL,
      APP_STORE_URL: process.env.APP_STORE_URL,
      APP_STORE_URL_IOS: process.env.APP_STORE_URL_IOS,
      APP_STORE_URL_ANDROID: process.env.APP_STORE_URL_ANDROID,
      BCRYPT_ROUNDS: process.env.BCRYPT_ROUNDS,
      PASSWORD_RESET_EXPIRES: process.env.PASSWORD_RESET_EXPIRES,
      EMAIL_VERIFICATION_EXPIRES: process.env.EMAIL_VERIFICATION_EXPIRES,
      INVITE_MATCH_WINDOW_SECONDS: process.env.INVITE_MATCH_WINDOW_SECONDS,
      
      // Google and Firebase Configuration
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      FIREBASE_SERVICE_ACCOUNT_JSON: process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
