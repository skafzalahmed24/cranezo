const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const routes = require('./routes');
const { errorHandler } = require('./middlewares/error.middleware');

const app = express();

// Trust reverse proxy (Nginx / Cloudflare / SSL termination)
app.set('trust proxy', 1);

// Security and utility middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false // Allows Swagger UI to execute inline scripts and styles
}));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static public assets (e.g. /public/roles/...)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Swagger API Documentation endpoint
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Cranzo API Documentation | Swagger UI',
  customCss: '.swagger-ui section.models { display: none !important; }',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    defaultModelsExpandDepth: -1,
    defaultModelExpandDepth: -1
  }
}));

// Raw Swagger JSON specification endpoint
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Alias /docs to /api/docs
app.get('/docs', (req, res) => res.redirect('/api/docs'));

// Mount all API routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
