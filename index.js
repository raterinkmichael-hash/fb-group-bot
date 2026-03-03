import fetch from "node-fetch";

// Decode Base64 cookies so Railway can't corrupt them
const FB_C_USER = Buffer.from(process.env.FB_C_USER, "base64").toString("utf8");
const FB_XS = Buffer.from(process.env.FB_XS, "base64").toString("utf8");

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

const GROUPS = [
  {
    name: "Group 1",
    url: process.env.FB_GROUP_URL_1,
    lastSeen: null
  },
  {
    name: "Group 2",
    url: process.env.FB_GROUP_URL_2,
    lastSeen: null
  }
];

// Startup logs
console.log("Bot starting...");
console.log("Loaded Groups:");
console.log("1:", process.env.FB_GROUP_URL_1);
console.log("2:", process.env.FB_GROUP_URL_2);
console.log("Webhook:", DISCORD_WEBHOOK_URL);
console.log("c_user:", FB_C_USER);
console.log("xs:", FB_XS);

// Validate ENV
if (!DISCORD_WEBHOOK_URL || !FB_C_USER || !FB_XS) {
  console.error("❌ Missing required environment variables.");
  process.exit(1);
}

for (const g of GROUPS) {
  if (!g.url) {
    console.error(`❌ Missing URL for ${g.name}.`);
    process.exit(1);
  }
}

async function fetchGroupPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Cookie": `c_user=${FB_C_USER}; xs=${FB_XS};`
      }
    });

    if (!res.ok) {
      console.error(`❌ Failed to fetch ${url} - Status: ${res.status}`);
      return null;
    }

    return await res.text();
  } catch (err) {
    console.error("❌ Error fetching group page:", err);
    return null;
  }
}

function extractPostIds(html) {
  const regex = /"group_post_id":"(\d+)"/g;
  const ids = new Set();
  let match;

  while ((match = regex.exec(html)) !== null) {
    ids.add(match[1]);
  }

  return Array.from(ids);
}

async function sendToDiscord(groupName, postId, groupUrl) {
  const postUrl = `${groupUrl}/posts/${postId}`;

  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `New post in **${groupName}**:\n${postUrl}`
      })
    });

    console.log(`📨 Sent new post from ${groupName}: ${postUrl}`);
  } catch (err) {
    console.error("❌ Failed to send Discord message:", err);
  }
}

async function checkGroup(group) {
  console.log(`🔍 Checking ${group.name}...`);

  const html = await fetchGroupPage(group.url);
  if (!html) return;

  const postIds = extractPostIds(html);
  if (postIds.length === 0) {
    console.log(`⚠️ No posts found for ${group.name}.`);
    return;
  }

  postIds.sort((a, b) => Number(b) - Number(a));
  const newest = postIds[0];

  if (!group.lastSeen) {
    console.log(`ℹ️ Initializing lastSeen for ${group.name}: ${newest}`);
    group.lastSeen = newest;
    return;
  }

  if (newest === group.lastSeen) {
    console.log(`⏳ No new posts in ${group.name}.`);
    return;
  }

  const newOnes = postIds.filter(id => Number(id) > Number(group.lastSeen));

  for (const id of newOnes.reverse()) {
    await sendToDiscord(group.name, id, group.url);
  }

  group.lastSeen = newest;
}

async function checkAllGroups() {
  console.log("====================================");
  console.log("🔁 Running full group check...");
  for (const group of GROUPS) {
    await checkGroup(group);
  }
}

checkAllGroups();
setInterval(checkAllGroups, 5 * 60 * 1000);
