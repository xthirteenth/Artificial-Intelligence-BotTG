/**
 * Simple logger utility for the application
 */
class Logger {
  /**
   * Log an informational message
   * @param {string} message - The message to log
   * @param {any} data - Optional data to log
   */
  info(message, data) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${message}`);
    if (data) console.log(data);
  }

  /**
   * Log an error message
   * @param {string} message - The error message to log
   * @param {Error|any} error - The error object or data
   */
  error(message, error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${message}`);
    if (error) {
      if (error instanceof Error) {
        console.error(`${error.message}\n${error.stack}`);
      } else {
        console.error(error);
      }
    }
  }

  /**
   * Log a warning message
   * @param {string} message - The warning message to log
   * @param {any} data - Optional data to log
   */
  warn(message, data) {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${message}`);
    if (data) console.warn(data);
  }

  /**
   * Log a debug message (only in development)
   * @param {string} message - The debug message to log
   * @param {any} data - Optional data to log
   */
  debug(message, data) {
    if (process.env.NODE_ENV !== "production") {
      const timestamp = new Date().toISOString();
      console.debug(`[${timestamp}] [DEBUG] ${message}`);
      if (data) console.debug(data);
    }
  }
}

module.exports = {
  logger: new Logger(),
};
