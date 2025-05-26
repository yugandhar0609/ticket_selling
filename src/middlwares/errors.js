const httpStatus = require("http-status");
const logger = require("../config/logger");
const { createApiError, isOperationalError } = require("../utils/apiError");

const errorConverter = (err, req, res, next) => {
  let error = err;
  
  // Check if it's already an API error by looking for our custom properties
  if (!error.statusCode || !error.hasOwnProperty('isOperational')) {
    const statusCode = error.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    const message = error.message || httpStatus[statusCode];
    error = createApiError(statusCode, message, false, err.stack);
  }
  
  next(error);
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;
  
  if (!isOperationalError(err)) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = httpStatus[httpStatus.INTERNAL_SERVER_ERROR];
  }

  res.locals.errorMessage = err.message;

  const response = {
    success: false,
    statusCode,
    message,
    ...{ stack: err.stack },
  };

  logger.error(err);

  res.status(statusCode).send(response);
};

module.exports = {
  errorConverter,
  errorHandler,
};
