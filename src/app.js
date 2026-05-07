const express = require('express');
const morgan = require('morgan');
const { helmet, cors, corsOptions } = require('./middleware/security');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const memberRoutes = require('./routes/memberRoutes');
const planRoutes = require('./routes/planRoutes');
const gymProfileRoutes = require('./routes/gymProfileRoutes');
const staffRoutes = require('./routes/staffRoutes');
const publicRoutes = require('./routes/publicRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const transformationRoutes = require('./routes/transformationRoutes');
const aiRoutes = require('./routes/aiRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(cors(corsOptions));

// Request logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parser
app.use(express.json({ limit: '10kb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/gym-profile', gymProfileRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/transformations', transformationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/payments', paymentRoutes);

// Health check
app.get('/health', (req, res) => res.status(200).json({ success: true, message: 'Server is running.' }));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
