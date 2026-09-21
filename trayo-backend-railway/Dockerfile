FROM node:20-alpine

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Copy source code
COPY . .

# Expose server port (Railway will bind process.env.PORT automatically)
EXPOSE 5000

# Start server
CMD ["node", "server.js"]
