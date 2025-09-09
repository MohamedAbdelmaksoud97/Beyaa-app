// utils/appError.js
class AppError extends Error {
  constructor(message, statusCode, fieldErrors) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    if (fieldErrors) this.fieldErrors = fieldErrors;

    Error.captureStackTrace?.(this, this.constructor);
  }
}

module.exports = AppError;
