import dotenv from "dotenv";
dotenv.config();

import fetch from "node-fetch";

// Load environment variables
const FB_GROUP_URL_1 = process.env.FB_GROUP_URL_1;
const FB_GROUP_URL_2 = process.env.FB_GROUP_URL_2;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const FB_C_USER = Buffer.from(process.env.FB_C_USER, "base64").toString("utf8");
const FB_XS = Buffer.from(process.env.FB_XS, "base64").toString("utf8");

// Log decoded cookies for debugging
console.log("Loaded Groups:");
console.log("1:", FB_GROUP_URL_1);
console.log("2:", FB_GROUP_URL_2);
console.log("Webhook:", DISCORD_WEBHOOK_URL);
console.log("c_user:", FB_C_USER);
console.log("xs:", FB_XS);
console.log("====================================");

// Facebook request headers
const fbHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Cookie": `c_user=${FB_C_USER}; xs=${FB_XS};`
};

// Function to fetch a Facebook group page
async function checkGroup(url) {
  try {
    console.log(`🔍 Checking ${url}...`);

    const response = await fetch(url, {
      method: "GET",
      headers: fbHeaders
    });

    if (!response.ok) {
      console.log(`❌ Failed to fetch ${url} - Status: ${response.status}`);
      return null;
    }

    const html = await response.text();
    return html;
  } catch (err) {
    console.error("❌ Error fetching group:", err);
    return null;
  }
}

// Function to send a message to Discord
async function sendToDiscord(message) {
  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message })
    });
  } catch (err) {
    console.error("❌ Failed to send to Discord:", err);
  }
}

// Main loop
async function runBot() {
  console.log("🔁 Running full group check...");

  const groups = [FB_GROUP_URL_1, FB_GROUP_URL_2];

  for (let i = 0; i < groups.length; i++) {
    const html = await checkGroup(groups[i]);

    if (html) {
      console.log(`✅ Successfully fetched Group ${i + 1}`);
      // You can add HTML parsing here later
    }
  }
}

// Run every 60 seconds
runBot();
setInterval(runBot, 60000);
