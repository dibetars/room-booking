const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Enable CORS for your frontend
app.use(cors({
  origin: 'http://localhost:5173' // Updated frontend URL
}));

// Parse JSON bodies
app.use(express.json());

// Proxy endpoint for Smoobu availability check
app.post('/api/check-availability', async (req, res) => {
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
    console.error('Error checking availability:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to check availability',
      details: error.response?.data || error.message
    });
  }
});

// Proxy endpoint for Smoobu apartment details
app.get('/api/room-details/:apartmentId', async (req, res) => {
  try {
    const { apartmentId } = req.params;
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
    console.error('Error fetching room details:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch room details',
      details: error.response?.data || error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 