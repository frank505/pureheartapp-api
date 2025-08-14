# Christian Recovery App - Backend API

A comprehensive Node.js Fastify API for a Christian recovery application, featuring user authentication, JWT tokens, MySQL database with Sequelize ORM, Redis caching, and Docker containerization.

## 🚀 Features

- **Authentication System**: Complete user registration, login, logout, password reset, and email verification
- **JWT Token Management**: Secure access and refresh tokens with blacklisting support
- **Database**: MySQL with Sequelize ORM for robust data management
- **Caching**: Redis for session management, rate limiting, and token blacklisting
- **Input Validation**: Comprehensive request validation with custom schemas
- **Rate Limiting**: Protection against brute force attacks and API abuse
- **Email Service**: Automated emails for verification, password reset, and welcome messages
- **Docker Support**: Full containerization with Docker Compose
- **TypeScript**: Full type safety throughout the application
- **Security**: Helmet for security headers, CORS configuration, and input sanitization
- **Monitoring**: Health checks, request logging, and error handling

## 🛠 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Fastify
- **Language**: TypeScript
- **Database**: MySQL 8.0
- **ORM**: Sequelize
- **Cache**: Redis 7
- **Authentication**: JWT
- **Email**: Nodemailer
- **Containerization**: Docker & Docker Compose
- **Development**: Nodemon for auto-restart

## 📋 Prerequisites

- Node.js 18 or higher
- Docker and Docker Compose
- Git

## 🚀 Getting Started

### 1. Clone the Repository

\`\`\`bash
git clone <repository-url>
cd christian-recovery-app
\`\`\`

### 2. Environment Configuration

Copy the example environment file and configure your settings:

\`\`\`bash
cp env.example .env
\`\`\`

Edit the \`.env\` file with your configuration:

\`\`\`env
# Server Configuration
NODE_ENV=development
PORT=3036
HOST=0.0.0.0

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=christian_recovery_db
DB_USER=root
DB_PASSWORD=rootpassword

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@christian-recovery-app.com

# Application Configuration
APP_NAME=Christian Recovery App
APP_URL=http://localhost:3036
FRONTEND_URL=http://localhost:3036
\`\`\`

### 3. Development Setup

#### Option A: Using Docker (Recommended)

Start all services with Docker Compose:

\`\`\`bash
# Install dependencies
npm install

# Start all services (Node.js, MySQL, Redis, phpMyAdmin)
npm run docker:dev
\`\`\`

This will start:
- **API Server**: http://localhost:3036
- **MySQL Database**: localhost:3306
- **Redis Cache**: localhost:6379

#### Option B: Local Development

If you prefer to run services locally:

\`\`\`bash
# Install dependencies
npm install

# Make sure MySQL and Redis are running locally
# Then start the development server
npm run dev
\`\`\`

### 4. Database Setup

The application will automatically:
- Create the database schema
- Run migrations
- Set up initial tables

## 📚 API Documentation

### Base URL
\`http://localhost:3036/api\`

### Authentication Endpoints

#### POST \`/auth/register\`
Register a new user account.

**Request Body:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Registration successful! Please check your email to verify your account.",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isEmailVerified": false,
    "isActive": true
  },
  "tokens": {
    "accessToken": "jwt-token",
    "refreshToken": "jwt-refresh-token",
    "expiresIn": 604800
  }
}
\`\`\`

#### POST \`/auth/login\`
Authenticate user credentials.

**Request Body:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
\`\`\`

#### POST \`/auth/logout\`
Logout user and invalidate token.

**Headers:**
\`Authorization: Bearer <jwt-token>\`

#### POST \`/auth/forgot-password\`
Request password reset email.

**Request Body:**
\`\`\`json
{
  "email": "user@example.com"
}
\`\`\`

#### POST \`/auth/reset-password\`
Reset password using token from email.

**Request Body:**
\`\`\`json
{
  "token": "reset-token",
  "userId": "user-uuid",
  "newPassword": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}
\`\`\`

#### POST \`/auth/change-password\`
Change password for authenticated user.

**Headers:**
\`Authorization: Bearer <jwt-token>\`

**Request Body:**
\`\`\`json
{
  "currentPassword": "SecurePass123!",
  "newPassword": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}
\`\`\`

#### POST \`/auth/verify-email\`
Verify email address using token.

**Request Body:**
\`\`\`json
{
  "token": "verification-token",
  "userId": "user-uuid"
}
\`\`\`

#### POST \`/auth/refresh-token\`
Refresh JWT tokens.

**Request Body:**
\`\`\`json
{
  "refreshToken": "jwt-refresh-token"
}
\`\`\`

#### GET \`/auth/me\`
Get current user profile.

**Headers:**
\`Authorization: Bearer <jwt-token>\`

### Health Check

#### GET \`/health\`
Check service health status.

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Service is healthy",
  "data": {
    "status": "OK",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "uptime": 12345,
    "environment": "development",
    "version": "1.0.0",
    "services": {
      "database": true,
      "redis": true
    }
  }
}
\`\`\`

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with configurable salt rounds
- **Rate Limiting**: Configurable rate limits for different endpoints
- **Account Lockout**: Temporary lockout after failed login attempts
- **Token Blacklisting**: Logout functionality with token invalidation
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Configurable CORS policies
- **Security Headers**: Helmet.js for security headers
- **SQL Injection Protection**: Sequelize ORM prevents SQL injection

## 📧 Email Templates

The application includes responsive HTML email templates for:
- Welcome emails
- Email verification
- Password reset instructions

## 🛠 Development

### Available Scripts

\`\`\`bash
# Development with auto-restart
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start

# Docker development
npm run docker:dev

# Docker production
npm run docker:prod
\`\`\`

### Project Structure

\`\`\`
src/
├── config/          # Configuration files
│   ├── database.ts  # Sequelize configuration
│   ├── environment.ts # Environment variables
│   └── redis.ts     # Redis configuration
├── middleware/      # Custom middleware
│   └── auth.ts      # Authentication middleware
├── models/          # Database models
│   ├── User.ts      # User model
│   └── index.ts     # Models index
├── routes/          # API routes
│   └── auth.ts      # Authentication routes
├── types/           # TypeScript type definitions
│   └── auth.ts      # Authentication types
├── utils/           # Utility functions
│   ├── email.ts     # Email service
│   ├── jwt.ts       # JWT utilities
│   └── validation.ts # Validation schemas
└── server.ts        # Main server file
\`\`\`

## 🧪 Testing

The application includes comprehensive error handling and logging. You can test the endpoints using tools like:
- Postman
- curl
- Insomnia

## 📦 Deployment

### Production Deployment

1. Set up production environment variables
2. Configure SSL certificates
3. Set up production database
4. Deploy with Docker Compose:

\`\`\`bash
npm run docker:prod
\`\`\`

### Environment Variables for Production

Make sure to update these for production:
- \`JWT_SECRET\`: Use a strong, random secret
- \`DB_PASSWORD\`: Strong database password
- \`EMAIL_*\`: Production email service credentials
- \`NODE_ENV=production\`

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit your changes (\`git commit -m 'Add some AmazingFeature'\`)
4. Push to the branch (\`git push origin feature/AmazingFeature\`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with love for the Christian recovery community
- Powered by modern Node.js technologies
- Designed for scalability and security

---

**May this application serve as a tool for healing and recovery in the Christian community. 🙏**