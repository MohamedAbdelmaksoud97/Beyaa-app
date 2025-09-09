// app.js (production-ready, Express 5 safe)
"use strict";

const express = require("express");
const app = express();

const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
// NOTE: do NOT use 'hpp' on Express 5 (reassigns req.query)
const cookieParser = require("cookie-parser");
const compression = require("compression");
// const { xss } = require("express-xss-sanitizer"); // ❌ remove this
const xssLib = require("xss"); // ✅ lightweight sanitizer

// Controllers
const storeControllers = require("./controllers/storeControllers");
const productControllers = require("./controllers/productControllers");
const filesControllers = require("./controllers/filesControllers");
const logoControllers = require("./controllers/logoControllers");
const authControllers = require("./controllers/authControllers");
const purchaseControllers = require("./controllers/purchaseControllers");
const globalErrorHandler = require("./controllers/errorController");

// Routers
const storeRouter = require("./routes/storeRoutes");
const productRoutes = require("./routes/productRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const userRoutes = require("./routes/userRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");

/* -------------------- Core app hardening -------------------- */

app.set("trust proxy", 1); // secure cookies & req.secure behind proxy
/*
app.use((req, res, next) => {
  if (req.secure || req.get("x-forwarded-proto") === "https") return next();
  return res.redirect(301, "https://" + req.headers.host + req.originalUrl);
});
*/
app.disable("x-powered-by"); // hide stack

// Static with caching
app.use(
  "/",
  express.static(path.join(__dirname, "public"), {
    setHeaders: (res, filePath) => {
      if (/\.[0-9a-f]{8,}\./i.test(path.basename(filePath))) {
        res.setHeader("Cache-Control", "public,max-age=31536000,immutable");
      } else {
        res.setHeader("Cache-Control", "public,max-age=3600");
      }
    },
  })
);

/* -------------------- CORS -------------------- */

const envAllowlist = (process.env.CORS_ALLOWLIST || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const allowlist = new Set([
  "http://localhost:5173",
  "http://localhost:5175",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:5177",
  "http://127.0.0.1:5177",
  "http://localhost:5181",
  "http://127.0.0.1:5181",
  ...envAllowlist,
]);

const corsDelegate = (req, cb) => {
  const origin = req.get("Origin");
  if (origin && allowlist.has(origin)) {
    cb(null, {
      origin,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders:
        req.get("Access-Control-Request-Headers") ||
        "Content-Type, Authorization",
      optionsSuccessStatus: 204,
      maxAge: 600,
    });
  } else {
    cb(null, { origin: false });
  }
};

app.use(cors(corsDelegate));
app.options(/.*/, cors(corsDelegate)); // Express 5-safe preflight

/* -------------------- Security headers -------------------- */

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "connect-src": ["'self'"].concat(envAllowlist),
      "img-src": ["'self'", "data:", "blob:", "https:"],
      "script-src": ["'self'"],
      "style-src": ["'self'", "https:", "'unsafe-inline'"],
      "frame-ancestors": ["'none'"],
    },
  })
);

/* -------------------- Rate limiting -------------------- */

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(
  ["/api/v1/users/login", "/api/v1/users/forgotPassword"],
  rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many attempts, please try again later.",
  })
);

/* -------------------- Parsers -------------------- */

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

/* -------------------- Sanitizers (Express 5 safe) -------------------- */

// ---- Safe NoSQL operator stripping for Express 5 (mutates in place; never reassigns req.query) ----
function stripNoSQLOps(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) stripNoSQLOps(obj[i]);
    return obj;
  }
  for (const key of Object.keys(obj)) {
    if (key[0] === "$" || key.includes(".")) {
      delete obj[key];
      continue;
    }
    const val = obj[key];
    if (val && typeof val === "object") stripNoSQLOps(val);
  }
  return obj;
}
function mongoSanitizeSafe() {
  return (req, _res, next) => {
    if (req.body && typeof req.body === "object") stripNoSQLOps(req.body);
    if (req.query && typeof req.query === "object") stripNoSQLOps(req.query);
    if (req.params && typeof req.params === "object") stripNoSQLOps(req.params);
    next();
  };
}
app.use(mongoSanitizeSafe());

// XSS sanitizer that MUTATES values (no reassign of req.*)
function deepSanitize(obj) {
  if (obj == null) return obj;
  if (typeof obj === "string") return xssLib(obj);
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) obj[i] = deepSanitize(obj[i]);
    return obj;
  }
  if (typeof obj === "object") {
    for (const k of Object.keys(obj)) obj[k] = deepSanitize(obj[k]);
    return obj;
  }
  return obj;
}
function xssSafe() {
  return (req, _res, next) => {
    if (req.body && typeof req.body === "object") deepSanitize(req.body);
    if (req.query && typeof req.query === "object") deepSanitize(req.query); // mutate only
    if (req.params && typeof req.params === "object") deepSanitize(req.params);
    next();
  };
}
app.use(xssSafe());

// HTTP Parameter Pollution guard (mutates only, keeps arrays for whitelisted keys)
function hppSafe(whitelist = []) {
  const allowed = new Set(whitelist);
  return (req, _res, next) => {
    const q = req.query;
    if (q && typeof q === "object") {
      for (const [key, val] of Object.entries(q)) {
        if (Array.isArray(val)) q[key] = allowed.has(key) ? val : val[0];
      }
    }
    next();
  };
}
app.use(hppSafe(["price", "ratingsAverage", "ratingsQuantity"]));

/* -------------------- Compression -------------------- */

app.use(compression());

/* -------------------- Routes -------------------- */

// Store
app.post(
  "/api/v1/createStore",
  authControllers.protect,
  logoControllers.uploadLogoImage,
  logoControllers.resizeLogoImage,
  storeControllers.createStore
);
app.use("/api/v1", storeRouter);

// Product
app.post(
  "/api/v1/:id/createProduct",
  authControllers.protect,
  filesControllers.uploadProductImages,
  filesControllers.resizeProductImages,
  productControllers.createProduct
);
app.use("/api/v1/:id/products", productRoutes);

// Purchase
app.post(
  "/api/v1/:slug/createPurchase",
  // authControllers.protect, // uncomment if purchases must be authenticated
  purchaseControllers.createPurchase
);
app.use("/api/v1/:slug/purchases", purchaseRoutes);

// Users & Admin
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/admin", adminUserRoutes);

/* -------------------- 404 & errors (last) -------------------- */

app.use((req, res, next) => {
  const err = new Error(`Can't find ${req.originalUrl} on this server`);
  err.statusCode = 404;
  err.status = "fail";
  next(err);
});

app.use(globalErrorHandler);

module.exports = app;
