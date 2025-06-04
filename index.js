// Load environment variables
require("dotenv").config();

const express = require("express");
const { createBullBoard } = require("@bull-board/api");
const { BullMQAdapter } = require("@bull-board/api/bullMQAdapter");
const { ExpressAdapter } = require("@bull-board/express");
const { Queue } = require("bullmq");
const Redis = require("ioredis");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const QUEUE_REFRESH_INTERVAL =
  parseInt(process.env.QUEUE_REFRESH_INTERVAL) || 60000;
const MAX_QUEUES = parseInt(process.env.MAX_QUEUES) || 100;

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  maxRetriesPerRequest: 3,
};

// Create Redis connection
const connection = new Redis(redisConfig);

// Function to discover all BullMQ queues using meta keys
async function discoverQueues() {
  try {
    // Get all meta keys that indicate actual BullMQ queues
    const metaKeys = await connection.keys("bull:*:meta");

    // Extract queue names from meta keys
    let queueNames = metaKeys
      .map((key) => {
        // Key format: bull:queueName:meta
        const parts = key.split(":");
        if (parts.length === 3 && parts[0] === "bull" && parts[2] === "meta") {
          return parts[1];
        }
        return null;
      })
      .filter((name) => name !== null);

    // Limit the number of queues based on MAX_QUEUES setting
    if (queueNames.length > MAX_QUEUES) {
      console.log(
        `⚠️  Found ${queueNames.length} queues, limiting to ${MAX_QUEUES} (MAX_QUEUES setting)`
      );
      queueNames = queueNames.slice(0, MAX_QUEUES);
    }

    console.log(
      `📋 Discovered ${
        queueNames.length
      } queues from meta keys: ${queueNames.join(", ")}`
    );
    return queueNames;
  } catch (error) {
    console.error("Error discovering queues:", error);
    return [];
  }
}

// Set up Bull Board with read-only configuration
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

// Configure read-only settings
const bullBoardConfig = {
  queues: [], // Will be populated dynamically
  serverAdapter: serverAdapter,
  options: {
    uiConfig: {
      boardTitle: "BullMQ Dashboard (Read-Only)",
      miscLinks: [],
      favIcon: {
        default: "static/images/logo.svg",
        alternative: "static/favicon.ico",
      },
    },
  },
};

const { addQueue, removeQueue, setQueues, replaceQueues } =
  createBullBoard(bullBoardConfig);

// Function to initialize and refresh queues
async function initializeQueues() {
  try {
    const discoveredQueues = await discoverQueues();

    if (discoveredQueues.length === 0) {
      console.log(
        "⚠️  No BullMQ queues found. Make sure your queues are created and have Redis keys."
      );
      return [];
    }

    // Create Queue instances for discovered queues
    const queues = discoveredQueues.map(
      (name) =>
        new Queue(name, {
          connection,
          defaultJobOptions: {
            removeOnComplete: false,
            removeOnFail: false,
          },
        })
    );

    // Create read-only adapters
    const queueAdapters = queues.map((queue) => {
      const adapter = new BullMQAdapter(queue);
      // Make adapter read-only by overriding methods
      adapter.clean = () => Promise.resolve();
      adapter.retryJob = () => Promise.resolve();
      adapter.promoteJob = () => Promise.resolve();
      return adapter;
    });

    // Replace queues in Bull Board
    replaceQueues(queueAdapters);

    return discoveredQueues;
  } catch (error) {
    console.error("Error initializing queues:", error);
    return [];
  }
}

// Store current queue names
let currentQueues = [];

// Middleware to make dashboard read-only
app.use("/admin/queues", (req, res, next) => {
  // Block POST, PUT, DELETE requests to make it read-only
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    return res.status(403).json({
      error: "Dashboard is in read-only mode",
      message: "Modifications are not allowed",
    });
  }
  next();
});

// Mount Bull Board
app.use("/admin/queues", serverAdapter.getRouter());

// Basic route
app.get("/", (req, res) => {
  res.json({
    message: "BullMQ Dashboard Server (Read-Only)",
    dashboard: `http://localhost:${PORT}/admin/queues`,
    queues: currentQueues,
    totalQueues: currentQueues.length,
    mode: "read-only",
    status: "running",
    config: {
      refreshInterval: QUEUE_REFRESH_INTERVAL,
      maxQueues: MAX_QUEUES,
      redisHost: process.env.REDIS_HOST || "localhost",
      redisPort: process.env.REDIS_PORT || 6379,
      redisDb: process.env.REDIS_DB || 0,
    },
  });
});

// Endpoint to refresh queue discovery
app.get("/refresh", async (req, res) => {
  try {
    console.log("🔄 Refreshing queue discovery...");
    currentQueues = await initializeQueues();
    res.json({
      message: "Queues refreshed successfully",
      queues: currentQueues,
      totalQueues: currentQueues.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to refresh queues",
      message: error.message,
    });
  }
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    await connection.ping();
    res.json({
      status: "healthy",
      redis: "connected",
      queues: currentQueues.length,
      mode: "read-only",
      discoveredQueues: currentQueues,
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      redis: "disconnected",
      error: error.message,
    });
  }
});

// Auto-refresh queues periodically using QUEUE_REFRESH_INTERVAL
let refreshIntervalId = null;

function startAutoRefresh() {
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId);
  }

  refreshIntervalId = setInterval(async () => {
    try {
      console.log(
        `🔄 Auto-refreshing queues (interval: ${QUEUE_REFRESH_INTERVAL}ms)...`
      );
      const newQueues = await discoverQueues();

      // Check if queues have changed
      if (
        JSON.stringify(newQueues.sort()) !==
        JSON.stringify(currentQueues.sort())
      ) {
        console.log("🔄 Queue changes detected, updating dashboard...");
        const previousCount = currentQueues.length;
        currentQueues = await initializeQueues();
        console.log(
          `📊 Queues updated: ${previousCount} -> ${currentQueues.length}`
        );
      } else {
        console.log("✓ No queue changes detected");
      }
    } catch (error) {
      console.error("Error during auto-refresh:", error);
    }
  }, QUEUE_REFRESH_INTERVAL);

  console.log(
    `⏰ Auto-refresh started with ${QUEUE_REFRESH_INTERVAL}ms interval`
  );
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  if (refreshIntervalId) clearInterval(refreshIntervalId);
  await connection.quit();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  if (refreshIntervalId) clearInterval(refreshIntervalId);
  await connection.quit();
  process.exit(0);
});

// Initialize and start server
async function startServer() {
  try {
    console.log("🔍 Discovering BullMQ queues...");
    console.log(
      `⚙️  Configuration: MAX_QUEUES=${MAX_QUEUES}, REFRESH_INTERVAL=${QUEUE_REFRESH_INTERVAL}ms`
    );

    currentQueues = await initializeQueues();

    // Start auto-refresh
    startAutoRefresh();

    app.listen(PORT, () => {
      console.log(
        `🚀 BullMQ Dashboard (Read-Only) running on http://localhost:${PORT}`
      );
      console.log(
        `📊 Dashboard available at: http://localhost:${PORT}/admin/queues`
      );
      console.log(`🔄 Refresh queues at: http://localhost:${PORT}/refresh`);
      console.log(
        `🔍 Monitoring ${currentQueues.length} queues: ${currentQueues.join(
          ", "
        )}`
      );
      console.log(`⚠️  Dashboard is in READ-ONLY mode`);
      console.log(`⏰ Auto-refresh enabled every ${QUEUE_REFRESH_INTERVAL}ms`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
