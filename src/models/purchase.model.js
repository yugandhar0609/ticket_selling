const prisma = require('../config/database');
const { createApiError } = require('../utils/apiError');
const httpStatus = require('http-status');

/**
 * Create a new purchase with idempotency check
 * @param {Object} purchaseData - Purchase data
 * @returns {Promise<Object>}
 */
const createPurchase = async (purchaseData) => {
  // Check if purchase with this idempotency key already exists
  const existingPurchase = await prisma.purchase.findUnique({
    where: { idempotencyKey: purchaseData.idempotencyKey },
    include: {
      event: true
    }
  });

  if (existingPurchase) {
    // Return the existing purchase instead of creating a new one
    return existingPurchase;
  }

  return await prisma.purchase.create({
    data: purchaseData,
    include: {
      event: true
    }
  });
};

/**
 * Get purchase by ID
 * @param {string} id - Purchase ID
 * @returns {Promise<Object>}
 */
const getPurchaseById = async (id) => {
  return await prisma.purchase.findUnique({
    where: { id },
    include: {
      event: true
    }
  });
};

/**
 * Get purchase by idempotency key
 * @param {string} idempotencyKey - Idempotency key
 * @returns {Promise<Object>}
 */
const getPurchaseByIdempotencyKey = async (idempotencyKey) => {
  return await prisma.purchase.findUnique({
    where: { idempotencyKey },
    include: {
      event: true
    }
  });
};

/**
 * Get all purchases for an event
 * @param {string} eventId - Event ID
 * @returns {Promise<Array>}
 */
const getPurchasesByEventId = async (eventId) => {
  return await prisma.purchase.findMany({
    where: { eventId },
    orderBy: {
      createdAt: 'desc'
    }
  });
};

/**
 * Get all purchases
 * @returns {Promise<Array>}
 */
const getAllPurchases = async () => {
  return await prisma.purchase.findMany({
    include: {
      event: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
};

/**
 * Get purchase statistics
 * @returns {Promise<Object>}
 */
const getPurchaseStats = async () => {
  const totalPurchases = await prisma.purchase.count();
  const totalSeats = await prisma.purchase.aggregate({
    _sum: {
      quantity: true
    }
  });

  return {
    totalPurchases,
    totalSeats: totalSeats._sum.quantity || 0
  };
};

module.exports = {
  createPurchase,
  getPurchaseById,
  getPurchaseByIdempotencyKey,
  getPurchasesByEventId,
  getAllPurchases,
  getPurchaseStats
}; 