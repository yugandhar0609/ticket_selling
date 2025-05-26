const catchAsync = require('../utils/catchAsync');
const { createApiError } = require('../utils/apiError');
const { 
  getMetrics, 
  recordSuccessPurchase, 
  recordFailedPurchase 
} = require('../utils/metrics');
const prisma = require('../config/database');
const httpStatus = require('http-status');
const logger = require('../config/logger');

// In-memory cache for high-performance seat tracking
let seatCache = {
  eventId: null,
  totalSeats: 0,
  seatsSold: 0,
  lastUpdated: 0
};

// Idempotency cache to avoid database lookups
const idempotencyCache = new Map();

// Initialize seat cache
async function initializeSeatCache() {
  try {
    const event = await prisma.event.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    
    if (event) {
      seatCache = {
        eventId: event.id,
        totalSeats: event.totalSeats,
        seatsSold: event.seatsSold,
        lastUpdated: Date.now()
      };
      logger.info(`[CACHE_INIT] Initialized seat cache - Total: ${event.totalSeats}, Sold: ${event.seatsSold}`);
    }
  } catch (error) {
    logger.error('[CACHE_INIT] Failed to initialize seat cache:', error);
  }
}

// Initialize cache on startup
initializeSeatCache();

/**
 * GET /event
 * Returns current event seat status
 */
const getEvent = catchAsync(async (req, res) => {
  // Use cache if available and recent
  if (seatCache.eventId && Date.now() - seatCache.lastUpdated < 5000) {
    const seatsRemaining = seatCache.totalSeats - seatCache.seatsSold;
    return res.status(200).json({
      totalSeats: seatCache.totalSeats,
      seatsSold: seatCache.seatsSold,
      seatsRemaining: seatsRemaining
    });
  }

  // Fallback to database
  const event = await prisma.event.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  if (!event) {
    throw createApiError(httpStatus.NOT_FOUND, 'No event found');
  }

  // Update cache
  seatCache = {
    eventId: event.id,
    totalSeats: event.totalSeats,
    seatsSold: event.seatsSold,
    lastUpdated: Date.now()
  };

  const seatsRemaining = event.totalSeats - event.seatsSold;
  
  res.status(200).json({
    totalSeats: event.totalSeats,
    seatsSold: event.seatsSold,
    seatsRemaining: seatsRemaining
  });
});

/**
 * Ultra-fast purchase function with minimal database operations
 */
async function attemptPurchase(idempotencyKey, quantity) {
  // Check idempotency cache first
  if (idempotencyCache.has(idempotencyKey)) {
    const cachedResult = idempotencyCache.get(idempotencyKey);
    logger.info(`[PURCHASE_CACHE_HIT] Found cached result for key: ${idempotencyKey}`);
    return { ...cachedResult, isIdempotent: true };
  }

  // Quick availability check using cache
  const seatsRemaining = seatCache.totalSeats - seatCache.seatsSold;
  if (quantity > seatsRemaining) {
    const soldOutResponse = {
      error: 'SOLD_OUT',
      statusCode: 409,
      seatsRemaining: seatsRemaining
    };
    
    // Cache the result
    idempotencyCache.set(idempotencyKey, soldOutResponse);
    
    // Async database update (don't wait for it)
    setImmediate(async () => {
      try {
        await prisma.purchase.create({
          data: {
            eventId: seatCache.eventId,
            quantity: quantity,
            idempotencyKey: idempotencyKey,
            statusCode: 409,
            responseBody: JSON.stringify({ error: 'SOLD_OUT' }),
            wasSuccessful: false
          }
        });
      } catch (error) {
        // Ignore errors in async update
      }
    });
    
    return soldOutResponse;
  }

  // Optimistic seat reservation
  seatCache.seatsSold += quantity;
  const newSeatsRemaining = seatCache.totalSeats - seatCache.seatsSold;
  
  const successResponse = {
    success: true,
    seatsRemaining: newSeatsRemaining,
    statusCode: 200
  };

  // Cache the result immediately
  idempotencyCache.set(idempotencyKey, successResponse);

  // Async database update (don't wait for it)
  setImmediate(async () => {
    try {
      await prisma.$transaction(async (tx) => {
        // Update event seats
        await tx.event.update({
          where: { id: seatCache.eventId },
          data: {
            seatsSold: {
              increment: quantity
            }
          }
        });

        // Create purchase record
        await tx.purchase.create({
          data: {
            eventId: seatCache.eventId,
            quantity: quantity,
            idempotencyKey: idempotencyKey,
            statusCode: 200,
            responseBody: JSON.stringify(successResponse),
            wasSuccessful: true
          }
        });
      });
      
      logger.info(`[PURCHASE_DB_SUCCESS] Persisted purchase for key: ${idempotencyKey}`);
    } catch (error) {
      logger.error(`[PURCHASE_DB_ERROR] Failed to persist purchase for key: ${idempotencyKey}`, error);
      
      // Rollback optimistic update
      seatCache.seatsSold -= quantity;
      idempotencyCache.delete(idempotencyKey);
    }
  });

  logger.info(`[PURCHASE_SUCCESS] Key: ${idempotencyKey}, Quantity: ${quantity}, Remaining: ${newSeatsRemaining}`);
  return successResponse;
}

/**
 * POST /purchase
 * Purchase tickets with ultra-fast in-memory processing
 */
const purchaseTickets = async (req, res, next) => {
  const { quantity } = req.body;
  const idempotencyKey = req.idempotencyKey;

  try {
    const result = await attemptPurchase(idempotencyKey, quantity);

    // Handle different result types
    if (result.error) {
      recordFailedPurchase();
      return res.status(result.statusCode).json({
        error: result.error
      });
    }

    if (result.isIdempotent) {
      const { statusCode, isIdempotent, ...responseData } = result;
      return res.status(statusCode).json(responseData);
    }

    // Record successful purchase metric
    recordSuccessPurchase();

    const { statusCode, ...responseData } = result;
    res.status(statusCode).json(responseData);

  } catch (error) {
    logger.error(`[PURCHASE_ERROR] Key: ${idempotencyKey}, Error: ${error.message}`, error);
    recordFailedPurchase();
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Purchase could not be completed'
    });
  }
};

/**
 * GET /stats
 * Returns API performance metrics
 */
const getStats = catchAsync(async (req, res) => {
  const metrics = getMetrics();
  
  res.status(200).json({
    totalRequests: metrics.totalRequests,
    successPurchases: metrics.successPurchases,
    failedPurchases: metrics.failedPurchases,
    p95Latency: Math.round(metrics.p95Latency * 100) / 100,
    cacheStats: {
      seatCache: seatCache,
      idempotencyCacheSize: idempotencyCache.size
    }
  });
});

// Cleanup function for graceful shutdown
process.on('SIGTERM', () => {
  idempotencyCache.clear();
});

module.exports = {
  getEvent,
  purchaseTickets,
  getStats
}; 