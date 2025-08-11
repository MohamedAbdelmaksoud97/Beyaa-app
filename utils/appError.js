class AppError extends Error {
  constructor(message, statusCode) {
    super(message); // set the message property

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true; // distinguish expected from programming errors

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
