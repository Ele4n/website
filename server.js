require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const sgMail = require('@sendgrid/mail');
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb'); // Import MongoClient from mongodb
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection URI
const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://Elean-ellen:GFvDaKCVq5CM4EqJ@cluster0.jcdaz.mongodb.net/'; // Use your MongoDB URI
const client = new MongoClient(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Configure SendGrid API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,  // Make sure to set this in your .env file
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: mongoUri }),
  cookie: {
    secure: false, // Set to true if using HTTPS
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 60 * 1000 // 30 minutes session expiry
  }
}));

const loginLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again after 30 minutes.',
  handler: function (req, res, next, options) {
    res.status(options.statusCode).json({ success: false, message: options.message });
  }
});

app.post('/login', loginLimiter, async (req, res) => {
  // Extract email and password from request body
  const { email, password } = req.body;

  // Input validation
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email format.' });
  }

  // Fetch User from Database
  const user = await usersCollection.findOne({ emaildb: email });
  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid email or password.' });
  }

  // Account Lockout Check
  if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
    const remainingTime = Math.ceil((user.accountLockedUntil - new Date()) / 60000);
    return res.status(403).json({ 
      success: false, 
      message: `Account is locked. Try again in ${remainingTime} minutes.` 
    });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);

if (!passwordMatch) {
  let invalidAttempts = (user.invalidLoginAttempts || 0) + 1;
  let updateFields = { invalidLoginAttempts: invalidAttempts };
  
  if (invalidAttempts >= 3) {
    updateFields.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
    updateFields.invalidLoginAttempts = 0; // Reset attempts after locking
    await usersCollection.updateOne({ _id: user._id }, { $set: updateFields });
    // Optionally, send an email notification about the account lock
    return res.status(403).json({ 
      success: false, 
      message: 'Account is locked due to multiple failed login attempts. Please try again after 30 minutes.' 
    });
  } else {
    await usersCollection.updateOne({ _id: user._id }, { $set: updateFields });
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid email or password.' 
    });
  }
}

// Reset invalid login attempts and account lock information on successful login
await usersCollection.updateOne(
  { _id: user._id },
  { 
    $set: { 
      invalidLoginAttempts: 0, 
      accountLockedUntil: null, 
      lastLoginTime: new Date() 
    }
  }
);

// Set up session
req.session.userId = user._id;
req.session.email = user.emaildb;
req.session.role = user.role;
req.session.studentIDNumber = user.studentIDNumber;

// Save the session
await new Promise((resolve, reject) => {
  req.session.save((err) => {
    if (err) return reject(err);
    resolve();
  });
});


  // Respond with success and user role
  res.json({ success: true, role: user.role, message: 'Login successful!' });

  // Further login logic (password check, etc.) goes here
});


// MongoDB connection and database setup
let usersCollection;
async function connectToDatabase() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const database = client.db('usersDB'); // Replace "usersDB" with your actual database name
    usersCollection = database.collection('tblUser'); // Replace "tblUser" with your actual collection name
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }
}
connectToDatabase();

// Token Schema with TTL (expires after 1 hour)
const tokenSchema = new mongoose.Schema({
  email: { type: String, required: true },
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 3600 }, // Token expires in 1 hour
});
const Token = mongoose.model('Token', tokenSchema);

// Generate Random String Function (for reset token)
function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Send Email Function
async function sendResetCodeEmail(email, resetCode) {
  const msg = {
    to: email,
    from: 'jemtejedo3@gmail.com', // Replace with your verified sender email
    subject: 'Password Reset Code',
    text: `Your password reset code is: ${resetCode}`,
    html: `<p>Your password reset code is:</p><h3>${resetCode}</h3>`,
  };
  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send reset email.');
  }
}

// Forgot Password Endpoint
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).send('Email is required');
  }

  try {
    // Check if a token already exists for the email
    let existingToken = await Token.findOne({ email });
    const resetToken = generateRandomString(8); // Increased token length to 8

    if (existingToken) {
      existingToken.token = resetToken;
      await existingToken.save();
    } else {
      const newToken = new Token({ email, token: resetToken });
      await newToken.save();
    }

    // Send reset code via email
    await sendResetCodeEmail(email, resetToken);
    res.status(200).send('Password reset email sent');
  } catch (error) {
    console.error('Error processing the password reset request:', error);
    res.status(500).send('Error processing the password reset request');
  }
});

// Send Password Reset Code Endpoint
app.post('/send-password-reset', async (req, res) => {
  const { email } = req.body;

  console.log('Received email:', email);

  try {
    // Query MongoDB to find the user by email
    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No account with that email address exists.' });
    }

    const resetCode = generateRandomString(8);
    const updateResult = await usersCollection.updateOne(
      { email },
      { $set: { resetKey: resetCode, resetExpires: new Date(Date.now() + 3600000) } } // Expiry in 1 hour
    );

    if (updateResult.modifiedCount === 1) {
      await sendResetCodeEmail(email, resetCode);
      res.json({ success: true, redirectUrl: '/reset-password.html' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to set reset code.' });
    }
  } catch (error) {
    console.error('Error processing your request:', error);
    res.status(500).json({ success: false, message: 'Error processing your request' });
  }
});

// Hash Password Function
function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hashSync(password, saltRounds);
}

// Reset Password Endpoint
app.post('/reset-password', async (req, res) => {
  const { resetKey, newPassword } = req.body;

  if (!resetKey || !newPassword) {
    return res.status(400).json({ success: false, message: 'Reset key and new password are required.' });
  }

  try {
    // Find the user by reset key and check if it's still valid
    const user = await usersCollection.findOne({
      resetKey,
      resetExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset key.' });
    }

    // Hash the new password
    const hashedPassword = hashPassword(newPassword);

    const updateResult = await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          resetKey: null,
          resetExpires: null
        }
      }
    );

    if (updateResult.modifiedCount === 1) {
      res.json({ success: true, message: 'Your password has been successfully reset.' });
    } else {
      res.status(500).json({ success: false, message: 'Password reset failed.' });
    }
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ success: false, message: 'Error resetting password' });
  }
});

// Sign Up Route
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if email and password are provided
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ emaildb: email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    // Validate password strength
    if (!isValidPassword(password)) {
      return res.status(400).json({ success: false, message: 'Password does not meet complexity requirements.' });
    }

    // Hash the password
    const hashedPassword = hashPassword(password);

    // Create the new user object
    const newUser = {
      emaildb: email,
      password: hashedPassword,
      createdAt: new Date()
    };

    // Insert the new user into the database
    const insertResult = await usersCollection.insertOne(newUser);

    // Check if the insert operation was successful
    if (insertResult.acknowledged) {
      res.json({ success: true, message: 'Account created successfully!' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to create account.' });
    }
  } catch (error) {
    console.error('Error creating account:', error.stack || error);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
});

//middleware 
function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ success: false, message: 'Unauthorized access.' });
    }
  }

  // Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
  next();
  } else {
  res.status(401).json({ success: false, message: 'Unauthorized access.' });
  }
  }
  // Fetch user details route
  app.get('/user-details', isAuthenticated, async (req, res) => {
  try {
  const email = req.session.email;
  if (!email) {
  return res.status(401).json({ success: false, message: 'Unauthorized access.' });
  }
  // Fetch user details from the database
  const user = await usersCollection.findOne(
  { emaildb: email },
  { projection: { emaildb: 1 } }
  );
  if (!user) {
  return res.status(404).json({ success: false, message: 'User not found.' });
  }
  // Return only necessary details
  res.json({
  success: true,
  user: {
  email: user.emaildb
  }
  });
  } catch (error) {
  console.error('Error fetching user details:', error);
  res.status(500).json({ success: false, message: 'Error fetching user details.' });
  }
  });

  
// Protected Routes
app.get('/dashboard', isAuthenticated, (req, res) => {
  res.sendFile(__dirname + '/public/dashboard.html');
});

 
app.post('/logout', async (req, res) => {
  if (!req.session.userId) {
    return res.status(400).json({ success: false, message: 'No user is logged in.' });
  }
  try {
    req.session.destroy(err => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ success: false, message: 'Logout failed.' });
      }
      res.clearCookie('connect.sid');
      // Prevent caching
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      return res.json({ success: true, message: 'Logged out successfully.' });
    });
  } catch (error) {
    console.error('Error during logout:', error);
    return res.status(500).json({ success: false, message: 'Failed to log out.' });
  }
});



// Helper Function for Password Validation
function isValidPassword(password) {
  // Example: Password must be at least 8 characters, contain letters and numbers
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
  return passwordRegex.test(password);
}

// Start the Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
