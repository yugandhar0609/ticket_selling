const express = require('express');
const ticketController = require('../../controller/ticket.controller');
const { validateBody, validateIdempotencyHeader, purchaseSchema } = require('../../utils/validation');
const { trackMetrics } = require('../../utils/metrics');

const router = express.Router();

// Apply metrics tracking to all routes
router.use(trackMetrics);

/**
 * @route GET /event
 * @desc Get current event seat status
 * @access Public
 * @returns {Object} { totalSeats, seatsSold, seatsRemaining }
 */
router.get('/event', ticketController.getEvent);

/**
 * @route POST /purchase
 * @desc Purchase tickets with idempotency and concurrency safety
 * @access Public
 * @headers Idempotency-Key (required)
 * @body { quantity: number } (1-10)
 * @returns {Object} { success: true, seatsRemaining } or { error: "SOLD_OUT" }
 */
router.post('/purchase', 
  validateIdempotencyHeader(),
  validateBody(purchaseSchema),
  ticketController.purchaseTickets
);

/**
 * @route GET /stats
 * @desc Get API performance metrics
 * @access Public
 * @returns {Object} { totalRequests, successPurchases, failedPurchases, p95Latency }
 */
router.get('/stats', ticketController.getStats);

module.exports = router; 