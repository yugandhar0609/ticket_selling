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

let seatCache = {
  eventId: null,
  totalSeats: 0,
  seatsSold: 0,
  lastUpdated: 0
};

const idempotencyCache = new Map();

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

initializeSeatCache();

const getEvent = catchAsync(async (req, res) => {
  if (seatCache.eventId && Date.now() - seatCache.lastUpdated < 5000) {
    const seatsRemaining = seatCache.totalSeats - seatCache.seatsSold;
    return res.status(200).json({
      totalSeats: seatCache.totalSeats,
      seatsSold: seatCache.seatsSold,
      seatsRemaining: seatsRemaining
    });
  }

  const event = await prisma.event.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  if (!event) {
    throw createApiError(httpStatus.NOT_FOUND, 'No event found');
  }

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

async function attemptPurchase(idempotencyKey, quantity) {
  if (idempotencyCache.has(idempotencyKey)) {
    const cachedResult = idempotencyCache.get(idempotencyKey);
    logger.info(`[PURCHASE_CACHE_HIT] Found cached result for key: ${idempotencyKey}`);
    return { ...cachedResult, isIdempotent: true };
  }

  const seatsRemaining = seatCache.totalSeats - seatCache.seatsSold;
  if (quantity > seatsRemaining) {
    const soldOutResponse = {
      error: 'SOLD_OUT',
      statusCode: 409,
      seatsRemaining: seatsRemaining
    };
    
    idempotencyCache.set(idempotencyKey, soldOutResponse);
    
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
      }
    });
    
    return soldOutResponse;
  }

  seatCache.seatsSold += quantity;
  const newSeatsRemaining = seatCache.totalSeats - seatCache.seatsSold;
  
  const successResponse = {
    success: true,
    seatsRemaining: newSeatsRemaining,
    statusCode: 200
  };

  idempotencyCache.set(idempotencyKey, successResponse);

  setImmediate(async () => {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.event.update({
          where: { id: seatCache.eventId },
          data: {
            seatsSold: {
              increment: quantity
            }
          }
        });

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
      
      seatCache.seatsSold -= quantity;
      idempotencyCache.delete(idempotencyKey);
    }
  });

  logger.info(`[PURCHASE_SUCCESS] Key: ${idempotencyKey}, Quantity: ${quantity}, Remaining: ${newSeatsRemaining}`);
  return successResponse;
}

const purchaseTickets = async (req, res, next) => {
  const { quantity } = req.body;
  const idempotencyKey = req.idempotencyKey;

  try {
    const result = await attemptPurchase(idempotencyKey, quantity);

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

process.on('SIGTERM', () => {
  idempotencyCache.clear();
});

module.exports = {
  getEvent,
  purchaseTickets,
  getStats
}; 