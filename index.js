const express = require('express');
const connectDB = require('./src/config/dbConfig');
const logger = require('./src/utils/logger');
const http = require('http');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const redis = require('redis');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const Joi = require('joi');
require('dotenv').config();
const { runConsumer } = require('./src/kafka/kafkaConsumer');
const acknowledgmentRoutes = require('./src/kafka/acknowledgmentRoutes');
const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

// Configure multer for file uploads with dynamic directories
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { firstName, lastName } = req.body;
    const userDir = path.join(__dirname, 'uploads', `${firstName}_${lastName}`);
    const fileDir = file.fieldname === 'profilePicture' ? 'profileimage' : 'avatarimage';
    const fullDir = path.join(userDir, fileDir);

    fs.mkdirSync(fullDir, { recursive: true });

    cb(null, fullDir);
  },
  filename: (req, file, cb) => {
    const fileExt = path.extname(file.originalname);
    cb(null, `${Date.now()}${fileExt}`);
  },
});
const upload = multer({ storage });

// Connect to MongoDB
connectDB();

// Initialize Redis client
const redisClient = redis.createClient();
redisClient.on('error', (err) => console.error('Redis error:', err));

// Enable CORS for all routes
app.use(cors());

// Use Helmet for security headers
app.use(helmet());

// Middleware to log HTTP requests
app.use((req, res, next) => {
  const startTime = new Date();
  res.on('finish', () => {
    const endTime = new Date();
    const responseTime = endTime - startTime;
    logger.info(`${req.method} ${req.url} - ${res.statusCode} ${res.statusMessage} - ${responseTime}ms`);
  });
  next();
});

// Disable X-Powered-By header
app.disable('x-powered-by');

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Middleware for multipart form-data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Use xss-clean for input sanitization
app.use(xss());

// Rate limiting to prevent brute-force attacks and 404-based blocking
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

const limiter404 = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 3, 
  handler: (req, res, next) => {
    res.status(429).send('Too many 404 requests, please try again later.');
  }
});

app.use(limiter);

// Import and use routes
const authRoutes = require('./src/routes/authRoutes');
const friendRoutes = require('./src/routes/friendRoutes');
const callRoutes = require('./src/routes/callRoutes');
const userRoutes = require('./src/routes/userRoutes');
const messageRoutes = require('./src/routes/messageRoutes'); // Make sure the path is correct

app.use('/api/auth', authRoutes);
app.use('/api/friends', (req, res, next) => {
  req.redisClient = redisClient;
  next();
}, friendRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/users', userRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/ack', acknowledgmentRoutes);

// Middleware for Joi validation
app.use((req, res, next) => {
  const schema = Joi.object({
    // Define your validation schema here
  });

  const { error } = schema.validate(req.body);
  if (error) {
    res.status(400).send(error.details[0].message);
  } else {
    next();
  }
});

// Default route for the root domain
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler - make sure this is at the end
app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = http.createServer(app);

const startServer = async () => {
  try {
    await runConsumer();
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Error starting the server:', err);
  }
};

startServer();
