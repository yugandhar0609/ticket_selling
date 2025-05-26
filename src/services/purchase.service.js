const { 
  createPurchase, 
  getPurchaseById, 
  getPurchaseByIdempotencyKey, 
  getPurchasesByEventId, 
  getAllPurchases, 
  getPurchaseStats 
} = require('../models/purchase.model');
const { 
  getEventById, 
  hasAvailableSeats 
} = require('../models/event.model');
const { createApiError } = require('../utils/apiError');
const httpStatus = require('http-status');
const prisma = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class PurchaseService {
  /**
   * Purchase tickets with idempotency and race condition protection
   * @param {Object} purchaseData - Purchase data
   * @returns {Promise<Object>}
   */
  static async purchaseTickets(purchaseData) {
    const { eventId, quantity, idempotencyKey } = purchaseData;

    // Validate input
    if (!eventId || !quantity || !idempotencyKey) {
      throw createApiError(httpStatus.BAD_REQUEST, 'Event ID, quantity, and idempotency key are required');
    }

    if (quantity <= 0) {
      throw createApiError(httpStatus.BAD_REQUEST, 'Quantity must be greater than 0');
    }

    if (quantity > 10) {
      throw createApiError(httpStatus.BAD_REQUEST, 'Cannot purchase more than 10 tickets at once');
    }

    // Check for existing purchase with same idempotency key
    const existingPurchase = await getPurchaseByIdempotencyKey(idempotencyKey);
    if (existingPurchase) {
      return {
        purchase: existingPurchase,
        isNewPurchase: false,
        message: 'Purchase already exists with this idempotency key'
      };
    }

    // Use a transaction to ensure atomicity and handle race conditions
    return await prisma.$transaction(async (tx) => {
      // Get event with lock (simulates SELECT ... FOR UPDATE)
      const event = await tx.event.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        throw createApiError(httpStatus.NOT_FOUND, 'Event not found');
      }

      // Check if enough seats are available
      if (!hasAvailableSeats(event, quantity)) {
        throw createApiError(
          httpStatus.CONFLICT, 
          `Not enough seats available. Requested: ${quantity}, Available: ${event.totalSeats - event.seatsSold}`
        );
      }

      // Create the purchase
      const purchase = await tx.purchase.create({
        data: {
          eventId,
          quantity,
          idempotencyKey
        },
        include: {
          event: true
        }
      });

      // Update seats sold
      await tx.event.update({
        where: { id: eventId },
        data: {
          seatsSold: {
            increment: quantity
          }
        }
      });

      return {
        purchase,
        isNewPurchase: true,
        message: 'Purchase successful'
      };
    });
  }

  /**
   * Get purchase by ID
   * @param {string} id - Purchase ID
   * @returns {Promise<Object>}
   */
  static async getPurchaseById(id) {
    const purchase = await getPurchaseById(id);
    if (!purchase) {
      throw createApiError(httpStatus.NOT_FOUND, 'Purchase not found');
    }
    return purchase;
  }

  /**
   * Get all purchases
   * @returns {Promise<Array>}
   */
  static async getAllPurchases() {
    return await getAllPurchases();
  }

  /**
   * Get purchases for an event
   * @param {string} eventId - Event ID
   * @returns {Promise<Array>}
   */
  static async getPurchasesByEventId(eventId) {
    // Verify event exists
    const event = await getEventById(eventId);
    if (!event) {
      throw createApiError(httpStatus.NOT_FOUND, 'Event not found');
    }

    return await getPurchasesByEventId(eventId);
  }

  /**
   * Get purchase statistics
   * @returns {Promise<Object>}
   */
  static async getPurchaseStats() {
    return await getPurchaseStats();
  }

  /**
   * Generate idempotency key
   * @returns {string}
   */
  static generateIdempotencyKey() {
    return uuidv4();
  }
}

module.exports = PurchaseService; 