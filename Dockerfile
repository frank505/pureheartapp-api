# ---- Base ----
# Use an official Node.js runtime as a parent image
FROM node:20-alpine AS base
# Set the working directory
WORKDIR /usr/src/app
# Copy package.json and package-lock.json
COPY package*.json ./

# ---- Dependencies ----
# Install production dependencies
FROM base AS dependencies
# In order to run `npm run build` we need the dev dependencies.
# We could just run `npm ci` here, but this would bloat the image with dev dependencies.
# Instead, we will use a multi-stage build to keep the final image small.
RUN npm ci

# ---- Build ----
# Build the app
FROM dependencies AS build
# Copy the rest of the app's source code
COPY . .
# Build the TypeScript source
RUN npm run build

# ---- Production ----
# Create the final production image
FROM base AS production
# Set the environment to production
ENV NODE_ENV=production
# Install only production dependencies
RUN npm ci --omit=dev
# Copy the built app from the build stage
COPY --from=build /usr/src/app/dist ./dist

# Create a non-root user for better security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
# Switch to the non-root user
USER nodejs

# Expose the port the app runs on
EXPOSE 3036

# Add a health check to ensure the container is running correctly
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3036/health || exit 1

# Define the command to run your app
CMD ["npm", "start"]
