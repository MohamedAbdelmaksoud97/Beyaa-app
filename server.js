require("dotenv").config();
// server.js
const app = require("./app");
const mongoose = require("mongoose");

// Load env variables

const DB = process.env.MONGO_URI.replace(
  "<db_password>",
  process.env.DATABASE_PASSWORD
);
mongoose
  .connect(DB)
  .then(() => console.log("DB connection successful!"))
  .catch((err) => console.error("DB connection error:", err));

const PORT = process.env.PORT || 3000;

// Start server
app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT} in ${process.env.NODE_ENV} mode`
  );
});
