require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

const app = express();
const port = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://login.smoobu.com"]
    }
  },
  xContentTypeOptions: true,
  xFrameOptions: true,
  xssFilter: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});
app.use(limiter);

// Request size limits
app.use(express.json({ limit: '10kb' }));

// Enable CORS for your frontend
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://*.vercel.app',
    'https://bokoboko.org',
    'https://www.bokoboko.org',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  logger.error('Error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  // Sanitize error response
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal Server Error' : err.message;

  res.status(statusCode).json({
    error: message
  });
};

// Validation middleware
const validateAvailabilityRequest = [
  body('apartmentId').isInt().withMessage('Invalid apartment ID'),
  body('arrival').isISO8601().withMessage('Invalid arrival date'),
  body('departure').isISO8601().withMessage('Invalid departure date'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Proxy endpoint for Smoobu availability check
app.post('/api/check-availability', validateAvailabilityRequest, async (req, res, next) => {
  try {
    const response = await axios.post(
      'https://login.smoobu.com/booking/checkApartmentAvailability',
      req.body,
      {
        headers: {
          'Api-Key': process.env.SMOOBU_API_KEY,
          'cache-control': 'no-cache'
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

// Proxy endpoint for Smoobu apartment details
app.get('/api/room-details/:apartmentId', async (req, res, next) => {
  try {
    const { apartmentId } = req.params;
    if (!Number.isInteger(Number(apartmentId))) {
      return res.status(400).json({ error: 'Invalid apartment ID' });
    }

    const response = await axios.get(
      `https://login.smoobu.com/api/apartments/${apartmentId}`,
      {
        headers: {
          'Api-Key': process.env.SMOOBU_API_KEY,
          'cache-control': 'no-cache'
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

// Apply error handling middleware
app.use(errorHandler);

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
}); 