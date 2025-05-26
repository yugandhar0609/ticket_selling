const express = require('express');
const eventController = require('../../controller/event.controller');

const router = express.Router();

/**
 * @route GET /api/v1/events
 * @desc Get all events
 * @access Public
 */
router.get('/', eventController.getAllEvents);

/**
 * @route POST /api/v1/events
 * @desc Create a new event
 * @access Public
 */
router.post('/', eventController.createEvent);

/**
 * @route GET /api/v1/events/:id
 * @desc Get event by ID
 * @access Public
 */
router.get('/:id', eventController.getEventById);

/**
 * @route GET /api/v1/events/:id/availability
 * @desc Get event seat availability
 * @access Public
 */
router.get('/:id/availability', eventController.getEventAvailability);

module.exports = router; 