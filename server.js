// File: server.js
// ============================================

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config(); // Load environment variables early

const app = express();
app.set('trust proxy', 1); // <-- 🔥 Add this line

// --- Middleware ---
const allowedOrigins = [
  'https://jovial-snickerdoodle-7f8d91.netlify.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173'
];

app.use(
  cors({
     origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log('Blocked by CORS:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware (for production)
if (process.env.NODE_ENV === 'production') {
  app.use(helmet());
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 100, // limit per IP
    message: 'Too many requests, please try again later.',
  }));
}

// --- MongoDB Connection ---
mongoose.set('strictQuery', false); // Recommended for Mongoose 7+

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error('ERROR: MONGO_URI not set in .env');
      process.exit(1);
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error (event):', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected!');
    });
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

// --- Routes ---
const couponRoutes = require('./routes/couponRoutes');
app.use('/api/coupons', couponRoutes);

const mailRoutes = require('./routes/mailRoutes');
app.use('/api', mailRoutes);

const membershipRoutes = require('./routes/membershipRoutes');
app.use('/api/membership', membershipRoutes);

const payment = require('./routes/paymentRoutes')
app.use('/api/pay', payment);

// --- Health Check ---
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    dbState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// --- Root Endpoint ---
app.get('/', (req, res) => {
  res.json({
    message: 'Coupon API Server is running',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      coupons: '/api/coupons',
    },
  });
});

// --- 404 Handler ---
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found. Please check the URL and HTTP method.',
  });
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR HANDLER:', err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server error occurred',
    errorDetails: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// --- Server Startup ---
const PORT = process.env.PORT || 5001;
let serverInstance;

const startServer = async () => {
  try {
    await connectDB();
    serverInstance = app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT} (${process.env.NODE_ENV || 'development'})`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();

// --- Graceful Shutdown ---
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down...`);
  if (serverInstance) {
    serverInstance.close(() => {
      console.log('🛑 Express server closed.');
      mongoose.connection.close(false, () => {
        console.log('🛑 MongoDB connection closed.');
        process.exit(0);
      });
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// --- Unhandled Rejections ---
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED PROMISE REJECTION:', reason);
  if (serverInstance) {
    serverInstance.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});
