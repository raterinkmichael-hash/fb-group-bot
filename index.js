import fetch from "node-fetch";

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

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const FB_C_USER = process.env.FB_C_USER;
const FB_XS = process.env.FB_XS;

async function fetchGroupPage(url) {
  const res = await fetch(url, {
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

async function sendToDiscord(groupName, postId, groupUrl) {
  const postUrl = `${groupUrl}/posts/${postId}`;
  await fetch(DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: `New post in **${groupName}**:\n${postUrl}`
    })
  });
}

async function checkGroup(group) {
  const html = await fetchGroupPage(group.url);
  if (!html) return;

  const postIds = extractPostIds(html);
  if (postIds.length === 0) return;

  postIds.sort((a, b) => Number(b) - Number(a));
  const newest = postIds[0];

  if (!group.lastSeen) {
    group.lastSeen = newest;
    return;
  }

  if (newest === group.lastSeen) return;

  const newOnes = postIds.filter(id => Number(id) > Number(group.lastSeen));
  for (const id of newOnes.reverse()) {
    await sendToDiscord(group.name, id, group.url);
  }

  group.lastSeen = newest;
}

async function checkAllGroups() {
  for (const group of GROUPS) {
    await checkGroup(group);
  }
}

checkAllGroups();
setInterval(checkAllGroups, 5 * 60 * 1000);
