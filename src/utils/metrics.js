/**
 * In-memory metrics tracking system
 * Stores API performance and usage statistics
 */

class MetricsStore {
  constructor() {
    this.totalRequests = 0;
    this.successPurchases = 0;
    this.failedPurchases = 0;
    this.requestTimes = []; // Store response times for p95 calculation
    this.maxRequestTimes = 1000; // Keep last 1000 requests for p95
  }

  /**
   * Increment total requests counter
   */
  incrementRequests() {
    this.totalRequests++;
  }

  /**
   * Increment successful purchases counter
   */
  incrementSuccessPurchases() {
    this.successPurchases++;
  }

  /**
   * Increment failed purchases counter
   */
  incrementFailedPurchases() {
    this.failedPurchases++;
  }

  /**
   * Record request response time
   * @param {number} responseTime - Response time in milliseconds
   */
  recordResponseTime(responseTime) {
    this.requestTimes.push(responseTime);
    
    // Keep only the last N requests to prevent memory bloat
    if (this.requestTimes.length > this.maxRequestTimes) {
      this.requestTimes.shift();
    }
  }

  /**
   * Calculate 95th percentile latency
   * @returns {number} p95 latency in milliseconds
   */
  getP95Latency() {
    if (this.requestTimes.length === 0) {
      return 0;
    }

    const sorted = [...this.requestTimes].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * 0.95) - 1;
    return sorted[index] || 0;
  }

  /**
   * Get all metrics
   * @returns {Object} Complete metrics object
   */
  getMetrics() {
    return {
      totalRequests: this.totalRequests,
      successPurchases: this.successPurchases,
      failedPurchases: this.failedPurchases,
      p95Latency: this.getP95Latency()
    };
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset() {
    this.totalRequests = 0;
    this.successPurchases = 0;
    this.failedPurchases = 0;
    this.requestTimes = [];
  }
}

// Singleton instance
const metricsStore = new MetricsStore();

/**
 * Middleware to track request metrics
 */
function trackMetrics(req, res, next) {
  const startTime = Date.now();
  
  // Increment total requests
  metricsStore.incrementRequests();
  
  // Track response time when request completes
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    metricsStore.recordResponseTime(responseTime);
  });
  
  next();
}

/**
 * Get current metrics
 * @returns {Object} Current metrics
 */
function getMetrics() {
  return metricsStore.getMetrics();
}

/**
 * Record successful purchase
 */
function recordSuccessPurchase() {
  metricsStore.incrementSuccessPurchases();
}

/**
 * Record failed purchase
 */
function recordFailedPurchase() {
  metricsStore.incrementFailedPurchases();
}

/**
 * Reset metrics (for testing)
 */
function resetMetrics() {
  metricsStore.reset();
}

module.exports = {
  trackMetrics,
  getMetrics,
  recordSuccessPurchase,
  recordFailedPurchase,
  resetMetrics
}; 