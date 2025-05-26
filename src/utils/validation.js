const { z } = require('zod');

/**
 * Validation schema for purchase request
 */
const purchaseSchema = z.object({
  quantity: z.number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(10, 'Quantity cannot exceed 10')
});

const idempotencyKeySchema = z.string()
  .min(1, 'Idempotency-Key header is required')
  .max(255, 'Idempotency-Key header too long');

/**
 * Validate purchase request body
 * @param {Object} data - Request body to validate
 * @returns {Object} Validation result
 */
function validatePurchaseRequest(data) {
  try {
    const validated = purchaseSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    return { 
      success: false, 
      error: error.errors.map(e => e.message).join(', ') 
    };
  }
}

/**
 * Validate idempotency key header
 * @param {string} key - Idempotency key to validate
 * @returns {Object} Validation result
 */
function validateIdempotencyKey(key) {
  try {
    const validated = idempotencyKeySchema.parse(key);
    return { success: true, data: validated };
  } catch (error) {
    return { 
      success: false, 
      error: error.errors.map(e => e.message).join(', ') 
    };
  }
}

/**
 * Middleware to validate request body against schema
 * @param {Object} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: error.errors.map(e => e.message).join(', ')
      });
    }
  };
}

/**
 * Middleware to validate idempotency key header
 * @returns {Function} Express middleware function
 */
function validateIdempotencyHeader() {
  return (req, res, next) => {
    const idempotencyKey = req.headers['idempotency-key'];
    
    if (!idempotencyKey) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key header is required'
      });
    }

    const validation = validateIdempotencyKey(idempotencyKey);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_IDEMPOTENCY_KEY',
        message: validation.error
      });
    }

    req.idempotencyKey = validation.data;
    next();
  };
}

module.exports = {
  purchaseSchema,
  idempotencyKeySchema,
  validatePurchaseRequest,
  validateIdempotencyKey,
  validateBody,
  validateIdempotencyHeader
}; 