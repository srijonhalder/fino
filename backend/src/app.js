const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

// Import route files
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const businessRoutes = require("./routes/business.routes");
const investmentRoutes = require("./routes/investment.routes");
const dividendRoutes = require("./routes/dividend.routes");
const adminRoutes = require("./routes/admin.routes");
const governanceRoutes = require("./routes/governance.routes");

function createApp() {
  const app = express();

  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      crossOriginOpenerPolicy: false,
      contentSecurityPolicy: false,
    }),
  );

  app.use(
    cors({
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (
          process.env.NODE_ENV !== "production" &&
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
        ) {
          return callback(null, true);
        }
        const allowed = process.env.FRONTEND_URL || "http://localhost:3000";
        if (origin === allowed) return callback(null, true);
        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
  }

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

  app.get("/", (req, res) => {
    res.json({
      success: true,
      message: "Fino API is running",
      version: "1.0.0",
      environment: process.env.NODE_ENV,
    });
  });

  app.get("/api/health", (req, res) => {
    res.json({
      success: true,
      message: "Fino API is healthy",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/config/public", (req, res) => {
    const { XLM_INR_RATE } = require("./utils/constants");
    const { adminKeypair } = require("./config/stellar");
    const { DIVIDEND_DISTRIBUTOR_ADDRESS } = require("./config/governance");
    res.json({
      success: true,
      data: {
        adminWalletAddress: adminKeypair ? adminKeypair.publicKey() : null,
        dividendDistributorAddress: DIVIDEND_DISTRIBUTOR_ADDRESS,
        xlmInrRate: XLM_INR_RATE,
      },
    });
  });

  const { walletConnect } = require("./controllers/auth.controller");
  app.post("/api/auth/wallet-connect", walletConnect);
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/businesses", businessRoutes);
  app.use("/api/investments", investmentRoutes);
  app.use("/api/dividends", dividendRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/governance", governanceRoutes);

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `Route ${req.originalUrl} not found`,
    });
  });

  app.use((err, req, res, next) => {
    console.error("❌ Error:", err.stack);

    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: messages,
      });
    }

    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `Duplicate value for ${field}. This ${field} is already registered.`,
      });
    }

    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please log in again.",
      });
    }

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please log in again.",
      });
    }

    const statusCode = err.statusCode || 500;
    const message =
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message || "Internal Server Error";

    res.status(statusCode).json({
      success: false,
      message,
    });
  });

  return app;
}

module.exports = { createApp };
