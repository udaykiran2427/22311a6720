const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
const PORT = 9876;
const MAX_WINDOW_SIZE = 7;

let currentWindow = [];
let authToken = process.env.ACCESS_TOKEN;

const SERVICE_URLS = {
  p: "http://20.244.56.144/evaluation-service/primes",
  f: "http://20.244.56.144/evaluation-service/fibo",
  e: "http://20.244.56.144/evaluation-service/even",
  r: "http://20.244.56.144/evaluation-service/rand",
};

async function regenerateAuthToken() {
  try {
    const response = await axios.post(process.env.AUTH_URL, {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
    });
    authToken = response.data.access_token;
    console.log("Authentication token regenerated successfully");
    return authToken;
  } catch (error) {
    console.error(
      "Failed to regenerate token:",
      error.response?.data || error.message
    );
    return null;
  }
}

async function retrieveNumbers(apiUrl) {
  try {
    return await executeApiCall(apiUrl);
  } catch (error) {
    if (error.response?.status === 401) {
      console.warn("Token expired. Attempting to regenerate...");
      const newToken = await regenerateAuthToken();
      if (newToken) {
        return await executeApiCall(apiUrl);
      }
    }
    console.error(
      "Error retrieving numbers:",
      error.response?.data || error.message
    );
    return [];
  }
}

async function executeApiCall(apiUrl) {
  const response = await axios.get(apiUrl, {
    timeout: 500,
    headers: {
      Authorization: `Bearer ${authToken}`,
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
    },
  });
  return response.data.numbers || [];
}

function modifyWindow(numbers) {
  for (const number of numbers) {
    if (!currentWindow.includes(number)) {
      if (currentWindow.length >= MAX_WINDOW_SIZE) {
        currentWindow.shift();
      }
      currentWindow.push(number);
    }
  }
}

function computeAverage(numbers) {
  if (numbers.length === 0) return 0.0;
  const sum = numbers.reduce((acc, num) => acc + num, 0);
  return (sum / numbers.length).toFixed(2);
}
app.get("/numbers/:id", async (req, res) => {
  const id = req.params.id;
  const previousState = [...currentWindow];

  if (!SERVICE_URLS[id]) {
    return res.status(400).json({ error: "Invalid service ID" });
  }

  const numbers = await retrieveNumbers(SERVICE_URLS[id]);
  modifyWindow(numbers);

  return res.json({
    windowPrevState: previousState,
    windowCurrState: currentWindow,
    numbers: numbers,
    avg: parseFloat(computeAverage(currentWindow)),
  });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
