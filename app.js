require('dotenv').config();
require('express-async-errors');
const path = require('path');

// extra security packages
const helmet = require('helmet');
const xss = require('xss-clean');
const express = require('express');
const app = express();
app.set('trust proxy', 1);

// routers
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const inventoryRouter = require('./routes/inventory');
const glaccountsRouter = require('./routes/glaccounts');
const memberRouter = require('./routes/members');
const savingsRouter = require('./routes/savings');


// error handler
const notFoundMiddleware = require('./middleware/not-found');
const errorHandlerMiddleware = require('./middleware/error-handler');


// app.use(express.static(path.resolve(__dirname, './client/build')));
// const multer = require('multer');
const { requestprocessor } = require('./middleware/requestprocessor');
const authMiddleware = require('./middleware/authentication');
const transactionMiddleware = require('./middleware/transaction');
const { decryptMiddleware, encryptResponseMiddleware } = require('./middleware/encrypt');
app.use(express.json());
app.use(helmet());
app.use(xss());
app.use(express.urlencoded({ extended: true })); 
app.use(decryptMiddleware)
app.use(encryptResponseMiddleware)
app.use(requestprocessor);


// routes
// THE ROUTE THAT WILL HANDLE REGISTERATION, SIGNING IN, CHANGE PASSWORD ETC
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/admin', authMiddleware, adminRouter);
app.use('/api/v1/inventory', authMiddleware, inventoryRouter);
app.use('/api/v1/glaccounts', authMiddleware, glaccountsRouter);
app.use('/api/v1/members', authMiddleware, memberRouter);
app.use('/api/v1/savings', authMiddleware, savingsRouter);
// app.use('/api/v1/jobs', authenticateUser, jobsRouter);

// app.get('*', (req, res) => {
//   res.sendFile(path.resolve(__dirname, './client/build', 'index.html'));
// });

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const port = process.env.PORT || 5000;

const start = async () => {
  try {
    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`)
    );
  } catch (error) { 
    console.log(error);
  }
};

start();
