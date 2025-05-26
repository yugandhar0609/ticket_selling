const express = require("express");
const cors = require("cors");
const httpStatus = require("http-status");
const morgan = require("./src/config/morgan");
const { errorConverter, errorHandler } = require("./src/middlwares/errors");
const bodyParser = require("body-parser");
const { createApiError } = require("./src/utils/apiError");
const { authLimiter } = require("./src/middlwares/rateLimiter");
const { trackMetrics } = require("./src/utils/metrics");
const routes = require('./src/routers/v1')

const app = express();

// Metrics tracking middleware (before everything else to capture all requests)
app.use(trackMetrics);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Logging middleware
app.use(morgan.successHandler);
app.use(morgan.errorHandler);

// CORS middleware
app.use(cors());
app.options("*", cors());

// Health check endpoint
app.get("/", (req, res) => {
  res.status(200).json({ 
    message: "Ticket Reservation API is running",
    version: "1.0.0",
    status: "OK"
  });
});

// Handle favicon requests to prevent 404 errors
app.get("/favicon.ico", (req, res) => {
  res.status(204).end();
});

// API routes
app.use("/api/v1", routes);

// Rate limiting for authentication (if needed)
app.use("/api/v1/auth", authLimiter);

// Error handling middleware
app.use((req, res, next) => {
  next(createApiError(httpStatus.NOT_FOUND, "Route not found"));
});

app.use(errorConverter);
app.use(errorHandler);

module.exports = app;
