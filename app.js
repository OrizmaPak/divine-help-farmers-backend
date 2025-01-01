require('dotenv').config();
require('express-async-errors');
const path = require('path');
const ngrok = require('@ngrok/ngrok');

// extra security packages
const helmet = require('helmet');
const xss = require('xss-clean');
const express = require('express');
const cors = require('cors');
const app = express();
app.set('trust proxy', 1);

// routers
const authRouter = require('./routes/auth');
const branchRouter = require('./routes/branch');
const adminRouter = require('./routes/admin');
const inventoryRouter = require('./routes/inventory');
const glaccountsRouter = require('./routes/glaccounts');
const memberRouter = require('./routes/members');
const savingsRouter = require('./routes/savings');
const loanRouter = require('./routes/loan');
const paymentRouter = require('./routes/payment');
const transactionsRouter = require('./routes/transactions');
const incomingsRouter = require('./routes/incomings');
const aiRouter = require('./routes/ai');

// error handler
const notFoundMiddleware = require('./middleware/not-found');
const errorHandlerMiddleware = require('./middleware/error-handler');

// middleware
const { requestprocessor } = require('./middleware/requestprocessor');
const authMiddleware = require('./middleware/authentication');
const transactionMiddleware = require('./middleware/transactions/transaction');
const { decryptMiddleware, encryptResponseMiddleware } = require('./middleware/encrypt');

app.use(express.json());
app.use(helmet());
app.use(xss());
app.use(cors()); // Add CORS middleware to fix cross-origin errors

const corsOptions = {
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.urlencoded({ extended: true }));
app.use(decryptMiddleware);
app.use(encryptResponseMiddleware);
app.use(requestprocessor);

// routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/branch', branchRouter);
app.use('/api/v1/admin', authMiddleware, adminRouter);
app.use('/api/v1/inventory', authMiddleware, inventoryRouter);
app.use('/api/v1/glaccounts', authMiddleware, glaccountsRouter);
app.use('/api/v1/members', authMiddleware, memberRouter);
app.use('/api/v1/savings', authMiddleware, savingsRouter);
app.use('/api/v1/loan', authMiddleware, loanRouter);
app.use('/api/v1/payment', authMiddleware, transactionMiddleware, paymentRouter);
app.use('/api/v1/transactions', authMiddleware, transactionsRouter); 
app.use('/api/v1/incomings', incomingsRouter);
app.use('/api/v1/ai', aiRouter);

app.get('/', (req, res) => {
    res.send('Welcome to the divine help farmers backend!');
});
app.use('*', (req, res) => {
    res.send('wild card handles this route');
});





app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const port = process.env.PORT || 5000;

const start = async () => {
  try {
    // Start your Express server
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server is listening on port ${port}...`);
    });

    // Only set up ngrok in development mode
    if (process.env.NODE_ENV === 'development') {
      // Establish connectivity
      const listener = await ngrok.forward({
        addr: port,
        authtoken_from_env: true,
      });

      // Output ngrok URL to console
      console.log(`ngrok tunnel opened at: ${listener.url()}`);
    }
  } catch (error) {
    console.log('Error starting server or ngrok tunnel:', error);
  }
};

start();
