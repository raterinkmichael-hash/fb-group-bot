import fetch from "node-fetch";

const GROUP_URL = process.env.FB_GROUP_URL;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const FB_C_USER = process.env.FB_C_USER;
const FB_XS = process.env.FB_XS;

let lastSeenPostId = null;

async function fetchGroupPage() {
  const res = await fetch(GROUP_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Cookie": `c_user=${FB_C_USER}; xs=${FB_XS};`
    }
  });

  if (!res.ok) return null;
  return await res.text();
}

function extractPostIds(html) {
  const regex = /"group_post_id":"(\d+)"/g;
  const ids = new Set();
  let match;
  while ((match = regex.exec(html)) !== null) ids.add(match[1]);
  return Array.from(ids);
}

async function sendToDiscord(postId) {
  const url = `${GROUP_URL}/posts/${postId}`;
  await fetch(DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: `New post:\n${url}` })
  });
}

async function checkForNewPosts() {
  const html = await fetchGroupPage();
  if (!html) return;

  const postIds = extractPostIds(html);
  if (postIds.length === 0) return;

  postIds.sort((a, b) => Number(b) - Number(a));
  const newest = postIds[0];

  if (!lastSeenPostId) {
    lastSeenPostId = newest;
    return;
  }

  if (newest === lastSeenPostId) return;

  const newOnes = postIds.filter(id => Number(id) > Number(lastSeenPostId));
  for (const id of newOnes.reverse()) await sendToDiscord(id);

  lastSeenPostId = newest;
}

checkForNewPosts();
setInterval(checkForNewPosts, 5 * 60 * 1000);
