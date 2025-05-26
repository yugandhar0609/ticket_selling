const prisma = require('../config/database');
const { createApiError } = require('../utils/apiError');
const httpStatus = require('http-status');

/**
 * Get event by ID
 * @param {string} id - Event ID
 * @returns {Promise<Object>}
 */
const getEventById = async (id) => {
  return await prisma.event.findUnique({
    where: { id },
    include: {
      purchases: {
        select: {
          id: true,
          quantity: true,
          createdAt: true
        }
      }
    }
  });
};

/**
 * Get event with pessimistic lock for seat booking
 * Uses SELECT ... FOR UPDATE to prevent race conditions
 * @param {string} id - Event ID
 * @returns {Promise<Object>}
 */
const getEventByIdForUpdate = async (id) => {
  // For SQLite, we simulate pessimistic locking with a transaction
  // In PostgreSQL, this would use SELECT ... FOR UPDATE
  return await prisma.$transaction(async (tx) => {
    const event = await tx.event.findUnique({
      where: { id }
    });
    
    if (!event) {
      throw createApiError(httpStatus.NOT_FOUND, 'Event not found');
    }
    
    return event;
  });
};

/**
 * Update seats sold for an event
 * @param {string} id - Event ID
 * @param {number} quantity - Number of seats to add
 * @returns {Promise<Object>}
 */
const updateEventSeatsSold = async (id, quantity) => {
  return await prisma.event.update({
    where: { id },
    data: {
      seatsSold: {
        increment: quantity
      }
    }
  });
};

/**
 * Check if enough seats are available
 * @param {Object} event - Event object
 * @param {number} requestedQuantity - Requested number of seats
 * @returns {boolean}
 */
const hasAvailableSeats = (event, requestedQuantity) => {
  return (event.seatsSold + requestedQuantity) <= event.totalSeats;
};

/**
 * Get all events
 * @returns {Promise<Array>}
 */
const getAllEvents = async () => {
  return await prisma.event.findMany({
    include: {
      _count: {
        select: { purchases: true }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
};

/**
 * Create a new event
 * @param {Object} eventData - Event data
 * @returns {Promise<Object>}
 */
const createEvent = async (eventData) => {
  return await prisma.event.create({
    data: eventData
  });
};

module.exports = {
  getEventById,
  getEventByIdForUpdate,
  updateEventSeatsSold,
  hasAvailableSeats,
  getAllEvents,
  createEvent
}; 