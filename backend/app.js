require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// datab Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/minute_made';
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const meetingRoutes = require('./routes/meeting');
app.use('/api/meeting', meetingRoutes);

// test
app.get('/', (req, res) => {
  res.send('API is running');
});

//server shuru
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
