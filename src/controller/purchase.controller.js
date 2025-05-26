const PurchaseService = require('../services/purchase.service');
const catchAsync = require('../utils/catchAsync');
const httpStatus = require('http-status');

const purchaseTickets = catchAsync(async (req, res) => {
  const { eventId, quantity, idempotencyKey } = req.body;
  
  const result = await PurchaseService.purchaseTickets({
    eventId,
    quantity,
    idempotencyKey
  });

  const statusCode = result.isNewPurchase ? httpStatus.CREATED : httpStatus.OK;
  
  res.status(statusCode).json({
    success: true,
    message: result.message,
    data: result.purchase,
    isNewPurchase: result.isNewPurchase
  });
});

const getPurchaseById = catchAsync(async (req, res) => {
  const purchase = await PurchaseService.getPurchaseById(req.params.id);
  res.status(httpStatus.OK).json({
    success: true,
    data: purchase
  });
});

const getAllPurchases = catchAsync(async (req, res) => {
  const purchases = await PurchaseService.getAllPurchases();
  res.status(httpStatus.OK).json({
    success: true,
    data: purchases
  });
});

const getPurchasesByEventId = catchAsync(async (req, res) => {
  const purchases = await PurchaseService.getPurchasesByEventId(req.params.eventId);
  res.status(httpStatus.OK).json({
    success: true,
    data: purchases
  });
});

const getPurchaseStats = catchAsync(async (req, res) => {
  const stats = await PurchaseService.getPurchaseStats();
  res.status(httpStatus.OK).json({
    success: true,
    data: stats
  });
});

const generateIdempotencyKey = catchAsync(async (req, res) => {
  const key = PurchaseService.generateIdempotencyKey();
  res.status(httpStatus.OK).json({
    success: true,
    data: { idempotencyKey: key }
  });
});

module.exports = {
  purchaseTickets,
  getPurchaseById,
  getAllPurchases,
  getPurchasesByEventId,
  getPurchaseStats,
  generateIdempotencyKey
}; 