const morgan = require("morgan");
const logger = require("./logger");

morgan.token("message", (req, res) => res.locals.errorMessage || "");

// Enhanced logging format with more details for observability
const getIpFormat = () => ":remote-addr";
const successResponseFormat = `${getIpFormat()} :method :url :status :res[content-length] - :response-time ms`;
const errorResponseFormat = `${getIpFormat()} :method :url :status :res[content-length] - :response-time ms - message: :message`;

const successHandler = morgan(successResponseFormat, {
  skip: (req, res) => res.statusCode >= 400,
  stream: { 
    write: (message) => {
      // Enhanced logging with timestamp and structured format
      const cleanMessage = message.trim();
      logger.info(`[REQUEST] ${cleanMessage}`);
    }
  },
});

const errorHandler = morgan(errorResponseFormat, {
  skip: (req, res) => res.statusCode < 400,
  stream: { 
    write: (message) => {
      // Enhanced error logging with timestamp and structured format
      const cleanMessage = message.trim();
      logger.error(`[REQUEST_ERROR] ${cleanMessage}`);
    }
  },
});

module.exports = {
  successHandler,
  errorHandler,
};
