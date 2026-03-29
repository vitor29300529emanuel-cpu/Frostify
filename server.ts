import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";

let aiClient: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

const cache = {
  stats: { data: null as any, lastFetch: 0 },
  logs: { data: null as any, lastFetch: 0 },
  botInfo: { data: null as any, lastFetch: 0 },
  recentMembers: { data: null as any, lastFetch: 0 }
};

const CACHE_TTL = {
  stats: 30000, // 30 seconds
  logs: 5000,   // 5 seconds
  botInfo: 60000, // 60 seconds
  recentMembers: 15000 // 15 seconds
};

// Automod State
let automodEnabled = false;
let lastCheckedMessageId: string | null = null;
const automodLogs: any[] = [];

async function runAutomod() {
  if (!automodEnabled) return;

  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  const channelId = "1486929898068246537"; // Using the same channel ID as logs

  if (!botToken || !guildId) return;

  try {
    let url = `https://discord.com/api/v10/channels/${channelId}/messages?limit=10`;
    if (lastCheckedMessageId) {
      url += `&after=${lastCheckedMessageId}`;
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bot ${botToken}` }
    });

    if (!response.ok) return;

    const messages = await response.json();
    if (!messages || messages.length === 0) return;

    // Messages are returned newest first. We need to process oldest first to update lastCheckedMessageId correctly.
    const newMessages = messages.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    for (const msg of newMessages) {
      lastCheckedMessageId = msg.id;

      // Skip bot messages
      if (msg.author.bot) continue;
      if (!msg.content || msg.content.trim() === '') continue;

      // Analyze message with Gemini
      try {
        const ai = getAI();
        const aiResponse = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Analise a seguinte mensagem enviada em um servidor do Discord. Determine se ela contém xingamentos ofensivos direcionados a alguém de forma agressiva/tóxica, ou se é apenas uma brincadeira/zoação amigável entre amigos (não ofensiva).
Mensagem: "${msg.content}"
Responda APENAS com um JSON contendo:
- "isOffensive": true se for ofensivo/tóxico e merecer punição, false se for brincadeira ou inofensivo.
- "reason": "breve explicação do motivo"`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                isOffensive: { type: Type.BOOLEAN },
                reason: { type: Type.STRING }
              },
              required: ["isOffensive", "reason"]
            }
          }
        });

        const result = JSON.parse(aiResponse.text || "{}");

        if (result.isOffensive) {
          // Timeout the user for 5 minutes
          const timeoutUntil = new Date(Date.now() + 5 * 60000).toISOString();
          const timeoutRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${msg.author.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bot ${botToken}`,
              'Content-Type': 'application/json',
              'X-Audit-Log-Reason': `Automod AI: ${result.reason}`
            },
            body: JSON.stringify({ communication_disabled_until: timeoutUntil })
          });

          const success = timeoutRes.ok;
          
          automodLogs.unshift({
            id: Date.now().toString() + Math.random().toString(),
            user: msg.author.username,
            userId: msg.author.id,
            content: msg.content,
            reason: result.reason,
            timestamp: new Date().toISOString(),
            success
          });

          // Keep only last 50 logs
          if (automodLogs.length > 50) automodLogs.pop();
        }
      } catch (aiError) {
        console.error("Automod AI Error:", aiError);
      }
    }
  } catch (err) {
    console.error("Automod Fetch Error:", err);
  }
}

// Run automod every 10 seconds
setInterval(runAutomod, 10000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cookieParser());
  app.use(express.json());

  // OAuth Routes
  app.get("/api/auth/url", (req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: "DISCORD_CLIENT_ID not configured" });
    }

    const redirectUri = `${process.env.APP_URL}/auth/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify email guilds',
    });

    res.json({ url: `https://discord.com/api/oauth2/authorize?${params}` });
  });

  app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send("No code provided");
    }

    try {
      const clientId = process.env.DISCORD_CLIENT_ID;
      const clientSecret = process.env.DISCORD_CLIENT_SECRET;
      const redirectUri = `${process.env.APP_URL}/auth/callback`;

      if (!clientId || !clientSecret) {
        throw new Error("Discord OAuth credentials not configured");
      }

      // Exchange code for token
      const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          code: code as string,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenRes.ok) {
        throw new Error("Failed to exchange token");
      }

      const tokenData = await tokenRes.json();

      // Fetch user info
      const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userRes.ok) {
        throw new Error("Failed to fetch user info");
      }

      const userData = await userRes.json();

      // Create JWT
      const jwtSecret = process.env.JWT_SECRET || "default_secret_do_not_use_in_prod";
      const token = jwt.sign(
        {
          id: userData.id,
          username: userData.username,
          avatar: userData.avatar,
          email: userData.email,
        },
        jwtSecret,
        { expiresIn: "7d" }
      );

      // Set cookie
      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Send success message to parent window and close popup
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Autenticação concluída com sucesso. Esta janela será fechada automaticamente.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("OAuth Error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.get("/api/auth/me", (req, res) => {
    const token = req.cookies.auth_token;
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const jwtSecret = process.env.JWT_SECRET || "default_secret_do_not_use_in_prod";
      const decoded = jwt.verify(token, jwtSecret);
      res.json({ user: decoded });
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("auth_token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.json({ success: true });
  });

  // API Route to fetch Discord Server Stats
  app.get("/api/discord/stats", async (req, res) => {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;

    if (!botToken || !guildId) {
      return res.status(500).json({ 
        error: "Discord credentials not configured. Please set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID." 
      });
    }

    if (Date.now() - cache.stats.lastFetch < CACHE_TTL.stats && cache.stats.data) {
      return res.json(cache.stats.data);
    }

    try {
      // Fetch guild info with approximate member counts
      const guildRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}?with_counts=true`, {
        headers: {
          Authorization: `Bot ${botToken}`
        }
      });

      if (!guildRes.ok) {
        if (guildRes.status === 429 && cache.stats.data) {
          return res.json(cache.stats.data);
        }
        throw new Error(`Discord API error: ${guildRes.statusText}`);
      }

      const guildData = await guildRes.json();

      const createdAt = new Date(Number((BigInt(guildData.id) >> 22n) + 1420070400000n)).toISOString();

      cache.stats.data = {
        id: guildData.id,
        name: guildData.name,
        icon: guildData.icon ? `https://cdn.discordapp.com/icons/${guildData.id}/${guildData.icon}.png` : null,
        ownerId: guildData.owner_id,
        verificationLevel: guildData.verification_level,
        explicitContentFilter: guildData.explicit_content_filter,
        rolesCount: guildData.roles?.length || 0,
        emojisCount: guildData.emojis?.length || 0,
        stickersCount: guildData.stickers?.length || 0,
        features: guildData.features || [],
        createdAt: createdAt,
        totalMembers: guildData.approximate_member_count || 0,
        onlineMembers: guildData.approximate_presence_count || 0,
        boosts: guildData.premium_subscription_count || 0,
        tier: guildData.premium_tier || 0
      };
      cache.stats.lastFetch = Date.now();

      res.json(cache.stats.data);
    } catch (error) {
      console.error("Error fetching Discord stats:", error);
      if (cache.stats.data) {
        return res.json(cache.stats.data);
      }
      res.status(500).json({ error: "Failed to fetch Discord stats" });
    }
  });

  // API Route to fetch Discord Channel Logs
  app.get("/api/discord/logs", async (req, res) => {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const channelId = "1486929898068246537";

    if (!botToken) {
      return res.status(500).json({ error: "DISCORD_BOT_TOKEN not configured." });
    }

    if (Date.now() - cache.logs.lastFetch < CACHE_TTL.logs && cache.logs.data) {
      return res.json(cache.logs.data);
    }

    try {
      const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?limit=50`, {
        headers: {
          Authorization: `Bot ${botToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 429 && cache.logs.data) {
          return res.json(cache.logs.data);
        }
        throw new Error(`Discord API error: ${response.statusText}`);
      }

      const messages = await response.json();
      
      cache.logs.data = messages.map((m: any) => ({
        id: m.id,
        content: m.content,
        author: m.author.username,
        avatar: m.author.avatar ? `https://cdn.discordapp.com/avatars/${m.author.id}/${m.author.avatar}.png` : null,
        timestamp: m.timestamp
      }));
      cache.logs.lastFetch = Date.now();

      res.json(cache.logs.data);
    } catch (error) {
      console.error("Error fetching Discord logs:", error);
      if (cache.logs.data) {
        return res.json(cache.logs.data);
      }
      res.status(500).json({ error: "Failed to fetch Discord logs" });
    }
  });

  // API Route to fetch Recent Members
  app.get("/api/discord/recent-members", async (req, res) => {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;

    if (!botToken || !guildId) {
      return res.status(500).json({ error: "DISCORD_BOT_TOKEN or DISCORD_GUILD_ID not configured." });
    }

    if (Date.now() - cache.recentMembers.lastFetch < CACHE_TTL.recentMembers && cache.recentMembers.data) {
      return res.json(cache.recentMembers.data);
    }

    try {
      const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members?limit=1000`, {
        headers: {
          Authorization: `Bot ${botToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 429 && cache.recentMembers.data) {
          return res.json(cache.recentMembers.data);
        }
        throw new Error(`Discord API error: ${response.statusText}`);
      }

      const members = await response.json();
      
      // Sort by joined_at descending (newest first)
      const sortedMembers = members.sort((a: any, b: any) => {
        return new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime();
      });

      // Take top 50
      const recent = sortedMembers.slice(0, 50);

      cache.recentMembers.data = recent.map((m: any) => ({
        id: m.user.id,
        username: m.user.username,
        avatar: m.user.avatar ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png` : null,
        joinedAt: m.joined_at
      }));
      cache.recentMembers.lastFetch = Date.now();

      res.json(cache.recentMembers.data);
    } catch (error) {
      console.error("Error fetching recent members:", error);
      if (cache.recentMembers.data) {
        return res.json(cache.recentMembers.data);
      }
      res.status(500).json({ error: "Failed to fetch recent members" });
    }
  });

  // API Route to fetch Bot Info (Status, Servers, Ping, RAM)
  app.get("/api/discord/bot-info", async (req, res) => {
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!botToken) {
      return res.status(500).json({ error: "DISCORD_BOT_TOKEN not configured." });
    }

    if (Date.now() - cache.botInfo.lastFetch < CACHE_TTL.botInfo && cache.botInfo.data) {
      return res.json(cache.botInfo.data);
    }

    try {
      const start = Date.now();
      // Fetch the guilds the bot is in
      const guildsRes = await fetch(`https://discord.com/api/v10/users/@me/guilds`, {
        headers: {
          Authorization: `Bot ${botToken}`
        }
      });
      const ping = Date.now() - start;

      if (!guildsRes.ok) {
        if (guildsRes.status === 429 && cache.botInfo.data) {
          return res.json(cache.botInfo.data);
        }
        throw new Error(`Discord API error: ${guildsRes.statusText}`);
      }

      const guilds = await guildsRes.json();
      
      // Calculate RAM usage of the Node process
      const ramUsage = Math.round(process.memoryUsage().rss / 1024 / 1024);

      cache.botInfo.data = {
        status: "Online",
        serverCount: guilds.length,
        ping: ping,
        ram: ramUsage
      };
      cache.botInfo.lastFetch = Date.now();

      res.json(cache.botInfo.data);
    } catch (error) {
      console.error("Error fetching bot info:", error);
      if (cache.botInfo.data) {
        return res.json(cache.botInfo.data);
      }
      res.status(500).json({ error: "Failed to fetch bot info" });
    }
  });

  // Automod API Routes
  app.get("/api/automod", (req, res) => {
    res.json({ enabled: automodEnabled, logs: automodLogs });
  });

  app.post("/api/automod/toggle", express.json(), (req, res) => {
    automodEnabled = !!req.body.enabled;
    // Reset lastCheckedMessageId when turning on to avoid processing old messages
    if (automodEnabled) {
      lastCheckedMessageId = null;
    }
    res.json({ enabled: automodEnabled });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
