/**
 * Create a custom API error object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {boolean} isOperational - Whether the error is operational
 * @param {string} stack - Error stack trace
 * @returns {Error} Custom error object
 */
function createApiError(statusCode, message, isOperational = true, stack = "") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = isOperational;
  
      if (stack) {
    error.stack = stack;
      } else {
    Error.captureStackTrace(error, createApiError);
  }
  
  return error;
}

/**
 * Check if an error is an operational API error
 * @param {Error} error - Error object to check
 * @returns {boolean} True if error is operational
 */
function isOperationalError(error) {
  return error.isOperational === true;
}

/**
 * Create a bad request error (400)
 * @param {string} message - Error message
 * @returns {Error} Bad request error
 */
function createBadRequestError(message) {
  return createApiError(400, message);
      }

/**
 * Create a not found error (404)
 * @param {string} message - Error message
 * @returns {Error} Not found error
 */
function createNotFoundError(message) {
  return createApiError(404, message);
}

/**
 * Create a conflict error (409)
 * @param {string} message - Error message
 * @returns {Error} Conflict error
 */
function createConflictError(message) {
  return createApiError(409, message);
}

/**
 * Create an internal server error (500)
 * @param {string} message - Error message
 * @returns {Error} Internal server error
 */
function createInternalServerError(message) {
  return createApiError(500, message);
}

module.exports = {
  createApiError,
  isOperationalError,
  createBadRequestError,
  createNotFoundError,
  createConflictError,
  createInternalServerError
};
  