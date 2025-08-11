// app.js
const express = require("express");
const app = express();

const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const { xss } = require("express-xss-sanitizer");

const storeControllers = require("./controllers/storeControllers");
const productControllers = require("./controllers/productControllers");
const filesControllers = require("./controllers/filesControllers");
const authControllers = require("./controllers/authControllers");
const purchaseControllers = require("./controllers/purchaseControllers");
const globalErrorHandler = require("./controllers/errorController");

const storeRouter = require("./routes/storeRoutes");
const productRoutes = require("./routes/productRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const userRoutes = require("./routes/userRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");

/* -------------------- Security & platform setup -------------------- */

// In prod behind a proxy (Heroku/Nginx), enable this so req.secure works and secure cookies set.
// app.set("trust proxy", 1); // PROD ONLY: needed when behind reverse proxy

// Security HTTP headers (safe in dev too)
app.use(helmet());

/* -------------------- CORS -------------------- */
// In dev, allow localhost:3000 (Vite/CRA). If you use cookies cross‑site, keep credentials:true.
app.use(
  cors({
    origin: "http://localhost:3000", // DEV: your frontend origin
    credentials: true, // needed if you send cookies from server to frontend
  })
);
// Preflight for complex requests (PUT/PATCH/DELETE, custom headers)
//app.options("*", cors());

// In prod, lock CORS to your real frontend domains, not *
/*
app.use(
  cors({
    origin: ["https://your-frontend.com"], // PROD: strict allowlist
    credentials: true
  })
);
app.options("*", cors());
*/

/* -------------------- Rate limiting -------------------- */
// Light limiter keeps noisy loops in check, fine for dev.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300, // DEV: a bit higher to avoid throttling yourself
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

// For prod, add a strict limiter on /login to mitigate brute force.
/*
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: "Too many login attempts, try again later."
});
app.use("/api/v1/users/login", authLimiter);
*/

/* -------------------- Parsers & sanitizers -------------------- */

// Limit payload size (10kb is fine in dev; bump if you upload base64, etc.)
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// Defend against NoSQL injection: strips $ and . in keys , *-*-*- built in when using mongoose methods
//app.use(mongoSanitize());

// XSS sanitizer (basic layer; template escaping/CSP still matter)
app.use(xss());

// Prevent HTTP Parameter Pollution. Add params you *allow* to repeat.
app.use(
  hpp({
    whitelist: ["price", "ratingsAverage", "ratingsQuantity"],
  })
);

// Compression helps even in dev; disable if you’re debugging raw responses.
/*
app.use(compression()); // PROD RECOMMENDED; optional in dev
*/

/* -------------------- Routes -------------------- */
// app.js
const path = require("path");
app.use(express.static(path.join(__dirname, "public")));
// Files saved to public/img/products/... will be served at /img/products/...

// Store routes
app.post(
  "/api/v1/createStore",
  authControllers.protect,
  storeControllers.createStore
);
app.use("/api/v1", storeRouter);

// Product routes
app.post(
  "/api/v1/:id/createProduct",
  authControllers.protect,
  filesControllers.uploadProductImages,
  filesControllers.resizeProductImages,
  productControllers.createProduct
);
app.use("/api/v1/:id/products", productRoutes);

// Purchase routes (protect if needed)
app.post(
  "/api/v1/:id/createPurchase",
  /* authControllers.protect, */ // enable when purchases must be authenticated
  purchaseControllers.createPurchase
);
app.use("/api/v1/:id/purchases", purchaseRoutes);

// User routes
app.use("/api/v1/users", userRoutes);
//admin routes
app.use("/api/v1/admin", adminUserRoutes);

/* -------------------- Global error handler (last) -------------------- */

app.use(globalErrorHandler);

module.exports = app;
