const { 
  getEventById, 
  getAllEvents, 
  createEvent 
} = require('../models/event.model');
const { createApiError } = require('../utils/apiError');
const httpStatus = require('http-status');

class EventService {
  /**
   * Get all events
   * @returns {Promise<Array>}
   */
  static async getAllEvents() {
    return await getAllEvents();
  }

  /**
   * Get event by ID
   * @param {string} id - Event ID
   * @returns {Promise<Object>}
   */
  static async getEventById(id) {
    const event = await getEventById(id);
    if (!event) {
      throw createApiError(httpStatus.NOT_FOUND, 'Event not found');
    }
    return event;
  }

  /**
   * Create a new event
   * @param {Object} eventData - Event data
   * @returns {Promise<Object>}
   */
  static async createEvent(eventData) {
    const { name, totalSeats = 5000 } = eventData;

    if (!name) {
      throw createApiError(httpStatus.BAD_REQUEST, 'Event name is required');
    }

    if (totalSeats <= 0) {
      throw createApiError(httpStatus.BAD_REQUEST, 'Total seats must be greater than 0');
    }

    return await createEvent({
      name,
      totalSeats
    });
  }

  /**
   * Get event availability
   * @param {string} id - Event ID
   * @returns {Promise<Object>}
   */
  static async getEventAvailability(id) {
    const event = await this.getEventById(id);
    
    return {
      eventId: event.id,
      name: event.name,
      totalSeats: event.totalSeats,
      seatsSold: event.seatsSold,
      availableSeats: event.totalSeats - event.seatsSold,
      isAvailable: event.seatsSold < event.totalSeats
    };
  }
}

module.exports = EventService; 