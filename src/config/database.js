const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    log: ['error', 'warn'],
  });
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['error', 'warn'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'file:./dev.db'
        }
      },
      // Optimize for high concurrency
      __internal: {
        engine: {
          // Increase connection pool size for SQLite
          connectionLimit: 20,
          // Reduce query timeout for faster failures
          queryTimeout: 5000,
          // Enable WAL mode for better concurrency
          enableWalMode: true
        }
      }
    });
  }
  prisma = global.__prisma;
}

// Enable WAL mode for SQLite to improve concurrency
if (process.env.DATABASE_URL?.includes('file:') || !process.env.DATABASE_URL) {
  prisma.$executeRaw`PRAGMA journal_mode = WAL;`.catch(err => {
    logger.warn('Could not enable WAL mode:', err.message);
  });
  
  prisma.$executeRaw`PRAGMA synchronous = NORMAL;`.catch(err => {
    logger.warn('Could not set synchronous mode:', err.message);
  });
  
  prisma.$executeRaw`PRAGMA cache_size = 10000;`.catch(err => {
    logger.warn('Could not set cache size:', err.message);
  });
  
  prisma.$executeRaw`PRAGMA temp_store = memory;`.catch(err => {
    logger.warn('Could not set temp store:', err.message);
  });
}

if (!global.__prismaShutdownRegistered) {
  global.__prismaShutdownRegistered = true;
  
  const gracefulShutdown = async () => {
    try {
      await prisma.$disconnect();
      logger.info('Prisma client disconnected gracefully');
    } catch (error) {
      logger.error('Error disconnecting Prisma client:', error);
    }
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
  process.on('beforeExit', gracefulShutdown);
}

module.exports = prisma; 