// utils/mongo-helpers.js (optional file)
function getDupKeyValue(err) {
  // Works with MongoDB driver & Mongoose
  return err?.keyValue || err?.errorResponse?.keyValue || {};
}
function getDupKeyPattern(err) {
  return err?.keyPattern || err?.errorResponse?.keyPattern || {};
}
module.exports = { getDupKeyValue, getDupKeyPattern };
