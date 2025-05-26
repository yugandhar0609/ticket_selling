const express = require('express');
const purchaseController = require('../../controller/purchase.controller');

const router = express.Router();

/**
 * @route POST /api/v1/purchases
 * @desc Purchase tickets
 * @access Public
 */
router.post('/', purchaseController.purchaseTickets);

/**
 * @route GET /api/v1/purchases
 * @desc Get all purchases
 * @access Public
 */
router.get('/', purchaseController.getAllPurchases);

/**
 * @route GET /api/v1/purchases/stats
 * @desc Get purchase statistics
 * @access Public
 */
router.get('/stats', purchaseController.getPurchaseStats);

/**
 * @route GET /api/v1/purchases/idempotency-key
 * @desc Generate a new idempotency key
 * @access Public
 */
router.get('/idempotency-key', purchaseController.generateIdempotencyKey);

/**
 * @route GET /api/v1/purchases/:id
 * @desc Get purchase by ID
 * @access Public
 */
router.get('/:id', purchaseController.getPurchaseById);

/**
 * @route GET /api/v1/purchases/event/:eventId
 * @desc Get all purchases for an event
 * @access Public
 */
router.get('/event/:eventId', purchaseController.getPurchasesByEventId);

module.exports = router; 