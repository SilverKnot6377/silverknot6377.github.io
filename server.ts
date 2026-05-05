import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import cookieSession from "cookie-session";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Stripe from "stripe";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "workshorts-super-secret-2026";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// Initialize Stripe (lazy load or check if key exists)
let stripe: Stripe | null = null;
if (STRIPE_SECRET_KEY) {
  // Validate key format
  if (STRIPE_SECRET_KEY.startsWith('mk_')) {
    console.error("CRITICAL ERROR: Invalid STRIPE_SECRET_KEY provided (starts with 'mk_'). Stripe secret keys must start with 'sk_test_' or 'sk_live_'. Please check your Stripe dashboard.");
  }

  stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2025-01-27.acacia' as any, // Updated to latest known version and cast to any to avoid futuristic linter mismatch
  });
} else {
  console.warn("STRIPE_SECRET_KEY is missing. Payment features will not work.");
}

app.set('trust proxy', 1);

// Config Route
app.get("/api/config", (req, res) => {
  res.json({
    stripeConfigured: !!stripe,
  });
});

// Database setup
const db = new Database("workshorts.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT,
    bio TEXT,
    website TEXT,
    twitter TEXT,
    instagram TEXT,
    avatar_url TEXT,
    email TEXT,
    phone TEXT,
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER NOT NULL,
    following_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users(id),
    FOREIGN KEY (following_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    username TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(username) REFERENCES users(username)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    content TEXT NOT NULL,
    parent_id INTEGER DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(video_id) REFERENCES videos(id),
    FOREIGN KEY(username) REFERENCES users(username)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS community_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(creator_id) REFERENCES users(id),
    FOREIGN KEY(author_id) REFERENCES users(id)
  );
`);

// Migration: Ensure password column exists in users table
try {
  db.prepare("ALTER TABLE users ADD COLUMN password TEXT").run();
} catch (e) {}

// Migration: Ensure avatar_url column exists in users table
try {
  db.prepare("ALTER TABLE users ADD COLUMN avatar_url TEXT").run();
} catch (e) {}

// Migration: Ensure followers/following columns exist
try {
  db.prepare("ALTER TABLE users ADD COLUMN followers_count INTEGER DEFAULT 0").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE users ADD COLUMN following_count INTEGER DEFAULT 0").run();
} catch (e) {}

// Migration: Ensure email/phone columns exist
try {
  db.prepare("ALTER TABLE users ADD COLUMN email TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE users ADD COLUMN phone TEXT").run();
} catch (e) {}

// Migration: Ensure VIP, language, and currency columns exist
try {
  db.prepare("ALTER TABLE users ADD COLUMN is_vip INTEGER DEFAULT 0").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'en'").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE users ADD COLUMN currency TEXT DEFAULT 'USD'").run();
} catch (e) {}

// Migration: Ensure views column exists in videos table
try {
  db.prepare("ALTER TABLE videos ADD COLUMN views INTEGER DEFAULT 0").run();
} catch (e) {}

// Migration: Ensure is_read column exists in messages table
try {
  db.prepare("ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT 0").run();
} catch (e) {}

app.use(express.json());
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Ensure directories exist
const uploadsDir = path.join(__dirname, "uploads");
const dataDir = path.join(__dirname, "data");
[uploadsDir, dataDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

app.use(cookieSession({
  name: 'workshorts.session',
  keys: ['workshorts-secret-v2-2026'],
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  secure: true,
  sameSite: 'none',
  httpOnly: true,
}));

// Ensure session object exists and handle JWT fallback
app.use((req, res, next) => {
  // 1. Check if session already exists from cookie
  if ((req.session as any)?.userId) {
    return next();
  }

  // 2. Fallback: Check Authorization header for JWT
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded && decoded.userId) {
        // Populate session from token for this request
        (req.session as any).userId = decoded.userId;
        (req.session as any).username = decoded.username;
        console.log(`[JWT Auth] Authenticated user: ${decoded.username}`);
      }
    } catch (err) {
      console.warn("[JWT Auth] Invalid token:", err);
    }
  }
  next();
});

// Debug middleware to track session state
app.use((req, res, next) => {
  if (req.url.startsWith('/api/')) {
    const userId = (req.session as any)?.userId;
    console.log(`[Session Debug] ${req.method} ${req.url}`);
    console.log(`  - UserID: ${userId || 'None'}`);
    console.log(`  - Cookie Header: ${req.headers.cookie || 'None'}`);
  }
  next();
});

// Multer setup for video and avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

app.use("/uploads", express.static(uploadsDir));

app.get("/api/cookie-fix", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <body style="font-family: sans-serif; background: #000; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; text-align: center; padding: 20px;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Connection Fixed!</h1>
        <p style="color: #888; margin-bottom: 24px;">Your browser has now granted permission to set security cookies.</p>
        <button onclick="window.close()" style="background: #fff; color: #000; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer;">Close this window</button>
        <script>
          // Try to close automatically after 3 seconds
          setTimeout(() => window.close(), 3000);
        </script>
      </body>
    </html>
  `);
});

// Auth Routes
app.post("/api/auth/signup", async (req, res) => {
  const { username, password, email, phone } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });

  const normalizedUsername = username.trim().toLowerCase();
  const trimmedPassword = password.trim();

  try {
    const hashedPassword = await bcrypt.hash(trimmedPassword, 10);
    const info = db.prepare("INSERT INTO users (username, password, email, phone) VALUES (?, ?, ?, ?)").run(normalizedUsername, hashedPassword, email || null, phone || null);
    const user = db.prepare("SELECT id, username, email, phone FROM users WHERE id = ?").get(info.lastInsertRowid);
    
    (req.session as any).userId = user.id;
    (req.session as any).username = user.username;
    
    // Generate JWT for fallback
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
    
    console.log(`[Signup Success] User: ${user.username}`);
    res.status(201).json({ ...user, token });
  } catch (err: any) {
    console.error("Signup error:", err);
    if (err.message.includes("UNIQUE constraint failed")) {
      return res.status(400).json({ error: "Username already exists" });
    }
    res.status(500).json({ error: "Internal server error: " + err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });

  const normalizedUsername = username.trim().toLowerCase();
  const trimmedPassword = password.trim();

  console.log(`Login attempt for: ${normalizedUsername}`);

  const user = db.prepare("SELECT * FROM users WHERE username = ? COLLATE NOCASE").get(normalizedUsername);
  
  if (!user) {
    console.log(`Login failed: User ${normalizedUsername} not found`);
    return res.status(401).json({ error: "User not found. Please check your username or sign up for a new account." });
  }

  if (!user.password) {
    console.log(`Login failed: User ${normalizedUsername} has no password set`);
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const isValid = await bcrypt.compare(trimmedPassword, user.password);
  if (!isValid) {
    console.log(`Login failed: Incorrect password for ${normalizedUsername}`);
    return res.status(401).json({ error: "Invalid credentials" });
  }

  console.log(`Login successful for: ${normalizedUsername}`);
  (req.session as any).userId = user.id;
  (req.session as any).username = user.username;
  
  // Generate JWT for fallback
  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
  
  console.log(`[Login Success] User: ${user.username}`);
  res.json({ id: user.id, username: user.username, email: user.email, phone: user.phone, token });
});

app.post("/api/auth/logout", (req, res) => {
  req.session = null;
  res.json({ message: "Logged out" });
});

app.get("/api/auth/me", (req, res) => {
  const userId = (req.session as any).userId;
  console.log(`[Auth Check] Me request - UserID: ${userId || 'None'}, Cookie: ${req.headers.cookie ? 'Present' : 'Missing'}`);
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const user = db.prepare("SELECT id, username, bio, website, twitter, instagram, avatar_url, email, phone, is_vip, language, currency FROM users WHERE id = ?").get(userId);
  
  if (!user) {
    // User ID in session but not in DB? Session invalid.
    req.session = null;
    return res.status(401).json({ error: "User not found" });
  }
  
  res.json(user);
});

// VIP Subscription Route (Stripe)
app.post("/api/vip/create-checkout-session", async (req, res) => {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  if (!stripe) {
    return res.status(503).json({ error: "Payment system not configured (Missing STRIPE_SECRET_KEY)" });
  }

  try {
    // Basic verification to provide a better error message if the key is obviously wrong
    if (STRIPE_SECRET_KEY?.startsWith('mk_')) {
      return res.status(400).json({ 
        error: "Invalid Stripe Secret Key format. Keys starting with 'mk_' are restricted. Please provide your actual Secret Key (sk_test_... or sk_live_...) in the Secrets panel." 
      });
    }

    if (!stripe) {
      return res.status(503).json({ error: "Stripe is not initialized. Please check your STRIPE_SECRET_KEY." });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'VIP Premium Subscription',
              description: 'Priority visibility, gold frame, and 24/7 support',
            },
            unit_amount: 999, // $9.99
          },
          quantity: 1,
        },
      ],
      mode: 'payment', // Use 'subscription' if you have a recurring price ID, but 'payment' is easier for one-off demo
      success_url: `${req.headers.origin}/vip-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/`,
      metadata: {
        userId: userId.toString(),
      },
    });

    res.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe Checkout Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/vip/verify-payment", async (req, res) => {
  const userId = (req.session as any).userId;
  const { sessionId } = req.body;

  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  if (!sessionId) return res.status(400).json({ error: "Missing session ID" });

  if (!stripe) {
    // Fallback for dev/demo if no stripe key
    // In a real scenario, this should fail.
    // But to avoid breaking the app if the user hasn't set the key yet, we might want to handle it.
    // However, the user asked for "real", so we should error if not configured.
    return res.status(503).json({ error: "Payment system not configured" });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status === 'paid') {
      // Verify the user ID matches (optional extra security)
      if (session.metadata?.userId && session.metadata.userId !== userId.toString()) {
        console.warn(`Payment verification mismatch: Session User ${session.metadata.userId} vs Request User ${userId}`);
        // We might still allow it if the session is valid, but logging is good.
      }

      db.prepare("UPDATE users SET is_vip = 1 WHERE id = ?").run(userId);
      res.json({ success: true, message: "VIP activated!" });
    } else {
      res.status(400).json({ error: "Payment not completed" });
    }
  } catch (err: any) {
    console.error("Payment Verification Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update User Settings (Language/Currency)
app.post("/api/users/settings", (req, res) => {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { language, currency } = req.body;
  
  try {
    db.prepare("UPDATE users SET language = ?, currency = ? WHERE id = ?").run(language || 'en', currency || 'USD', userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API Routes
app.get("/api/videos", (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = parseInt(req.query.offset as string) || 0;

  const videos = db.prepare(`
    SELECT v.*, u.avatar_url, u.is_vip
    FROM videos v 
    JOIN users u ON v.username = u.username 
    ORDER BY u.is_vip DESC, v.views ASC, v.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
  res.json(videos);
});

app.post("/api/videos", (req, res, next) => {
  upload.single("video")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Video upload error: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ error: `Server video upload error: ${err.message}` });
    }
    next();
  });
}, (req, res) => {
  const { title, description } = req.body;
  const username = (req.session as any).username;
  const videoFile = req.file;

  if (!username) return res.status(401).json({ error: "Must be logged in to upload" });
  if (!videoFile) return res.status(400).json({ error: "No video file uploaded" });

  const videoUrl = `/uploads/${videoFile.filename}`;
  
  const info = db.prepare(
    "INSERT INTO videos (title, description, video_url, username) VALUES (?, ?, ?, ?)"
  ).run(title || "Untitled", description || "", videoUrl, username);

  const newVideo = db.prepare("SELECT * FROM videos WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(newVideo);
});

app.delete("/api/videos/:id", (req, res) => {
  const { id } = req.params;
  const username = (req.session as any).username;

  if (!username) return res.status(401).json({ error: "Must be logged in to delete" });

  const video = db.prepare("SELECT username FROM videos WHERE id = ?").get(id);
  if (!video) return res.status(404).json({ error: "Video not found" });

  if (video.username !== username) {
    return res.status(403).json({ error: "Unauthorized to delete this video" });
  }

  db.prepare("DELETE FROM videos WHERE id = ?").run(id);
  res.json({ success: true });
});

app.get("/api/users", (req, res) => {
  const { q, exclude } = req.query;
  
  let users;
  if (q) {
    users = db.prepare(`
      SELECT username, avatar_url, bio
      FROM users
      WHERE username LIKE ? AND username != ?
      LIMIT 50
    `).all(`%${q}%`, exclude || "");
  } else {
    // Return empty if no query (as requested)
    users = [];
  }
  res.json(users);
});

// User Profile Routes
app.get("/api/users/:username", (req, res) => {
  const { username } = req.params;
  const currentUserId = (req.session as any).userId;

  const user = db.prepare("SELECT id, username, bio, website, twitter, instagram, avatar_url, created_at FROM users WHERE username = ? COLLATE NOCASE").get(username);
  if (!user) return res.status(404).json({ error: "User not found" });
  
  const videos = db.prepare("SELECT * FROM videos WHERE username = ? ORDER BY created_at DESC").all(username);
  res.json({ ...user, videos });
});

app.post("/api/users/:username/avatar", (req, res, next) => {
  upload.single("avatar")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Upload limit exceeded or invalid field: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ error: `Server upload error: ${err.message}` });
    }
    next();
  });
}, (req, res) => {
  const { username } = req.params;
  const currentUsername = (req.session as any).username;
  
  console.log(`Avatar upload attempt for ${username}. Session username: ${currentUsername}`);
  
  if (!currentUsername || username !== currentUsername) {
    console.warn(`Unauthorized avatar upload attempt: ${username} vs ${currentUsername}`);
    return res.status(403).json({ error: "Unauthorized: Please log in again." });
  }

  try {
    const avatarFile = req.file;
    if (!avatarFile) {
      return res.status(400).json({ error: "No avatar file uploaded" });
    }

    const avatarUrl = `/uploads/${avatarFile.filename}`;
    db.prepare("UPDATE users SET avatar_url = ? WHERE username = ?").run(avatarUrl, username);
    
    res.json({ avatar_url: avatarUrl });
  } catch (err: any) {
    console.error("Avatar upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/users/:username", (req, res) => {
  const { username } = req.params;
  const currentUsername = (req.session as any).username;
  
  if (username !== currentUsername) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const { bio, website, twitter, instagram, email, phone } = req.body;
  
  db.prepare(
    "UPDATE users SET bio = ?, website = ?, twitter = ?, instagram = ?, email = ?, phone = ? WHERE username = ?"
  ).run(bio, website, twitter, instagram, email || null, phone || null, username);
  
  const updated = db.prepare("SELECT id, username, bio, website, twitter, instagram, avatar_url, email, phone FROM users WHERE username = ?").get(username);
  res.json(updated);
});

// Community Routes
app.get("/api/users/:username/community", (req, res) => {
  const { username } = req.params;
  const user = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (!user) return res.status(404).json({ error: "User not found" });

  const posts = db.prepare(`
    SELECT cp.*, u.username as author_username, u.avatar_url as author_avatar
    FROM community_posts cp
    JOIN users u ON cp.author_id = u.id
    WHERE cp.creator_id = ?
    ORDER BY cp.created_at DESC
  `).all(user.id);
  res.json(posts);
});

app.post("/api/users/:username/community", (req, res) => {
  const { username } = req.params;
  const { content } = req.body;
  const currentUserId = (req.session as any).userId;

  if (!currentUserId) return res.status(401).json({ error: "Unauthorized" });
  if (!content) return res.status(400).json({ error: "Content is required" });

  const creator = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (!creator) return res.status(404).json({ error: "Creator not found" });

  db.prepare("INSERT INTO community_posts (creator_id, author_id, content) VALUES (?, ?, ?)")
    .run(creator.id, currentUserId, content);

  res.json({ success: true });
});

// Comment Routes
app.get("/api/videos/:id/comments", (req, res) => {
  const { id } = req.params;
  const comments = db.prepare(`
    SELECT c.*, u.avatar_url 
    FROM comments c
    JOIN users u ON c.username = u.username
    WHERE c.video_id = ? 
    ORDER BY c.created_at ASC
  `).all(id);
  res.json(comments);
});

app.post("/api/videos/:id/comments", (req, res) => {
  const { id } = req.params;
  const { content, parent_id } = req.body;
  const username = (req.session as any).username;

  if (!username) return res.status(401).json({ error: "Must be logged in to comment" });

  const info = db.prepare(
    "INSERT INTO comments (video_id, username, content, parent_id) VALUES (?, ?, ?, ?)"
  ).run(id, username, content, parent_id || null);
  
  const newComment = db.prepare("SELECT * FROM comments WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(newComment);
});

app.post("/api/videos/:id/like", (req, res) => {
  const { id } = req.params;
  db.prepare("UPDATE videos SET likes = likes + 1 WHERE id = ?").run(id);
  const updated = db.prepare("SELECT likes FROM videos WHERE id = ?").get(id);
  res.json(updated);
});

app.post("/api/videos/:id/view", (req, res) => {
  const { id } = req.params;
  db.prepare("UPDATE videos SET views = views + 1 WHERE id = ?").run(id);
  const updated = db.prepare("SELECT views FROM videos WHERE id = ?").get(id);
  res.json(updated);
});

// Chat Routes
app.get("/api/chat/messages/:otherUsername", (req, res) => {
  const { otherUsername } = req.params;
  const userId = (req.session as any).userId;
  if (!userId) {
    console.warn(`[Chat Auth Failure] GET messages for ${otherUsername} failed. Session:`, req.session);
    return res.status(401).json({ error: "Unauthorized: Your session has expired or you are not logged in." });
  }

  const otherUser = db.prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE").get(otherUsername);
  if (!otherUser) return res.status(404).json({ error: "User not found" });

  // Mark messages as read
  db.prepare("UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ? AND is_read = 0").run(userId, otherUser.id);

  const messages = db.prepare(`
    SELECT m.*, s.username as sender_username, r.username as receiver_username
    FROM messages m
    JOIN users s ON m.sender_id = s.id
    JOIN users r ON m.receiver_id = r.id
    WHERE (m.sender_id = ? AND m.receiver_id = ?)
       OR (m.sender_id = ? AND m.receiver_id = ?)
    ORDER BY m.created_at ASC
  `).all(userId, otherUser.id, otherUser.id, userId);

  res.json(messages);
});

app.post("/api/chat/messages/:otherUsername", (req, res) => {
  const { otherUsername } = req.params;
  const { content } = req.body;
  const userId = (req.session as any).userId;
  if (!userId) {
    console.warn(`[Chat Auth Failure] POST message to ${otherUsername} failed. Session:`, req.session);
    return res.status(401).json({ error: "Unauthorized: Your session has expired or you are not logged in." });
  }

  const otherUser = db.prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE").get(otherUsername);
  if (!otherUser) return res.status(404).json({ error: "User not found" });

  const info = db.prepare(
    "INSERT INTO messages (sender_id, receiver_id, content, is_read) VALUES (?, ?, ?, 0)"
  ).run(userId, otherUser.id, content);

  const newMessage = db.prepare("SELECT * FROM messages WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(newMessage);
});

app.get("/api/chat/conversations", (req, res) => {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const conversations = db.prepare(`
    SELECT u.username, u.avatar_url, u.bio,
           (SELECT COUNT(*) FROM messages m2 WHERE m2.sender_id = u.id AND m2.receiver_id = ? AND m2.is_read = 0) as unread_count
    FROM users u
    JOIN messages m ON (u.id = m.sender_id OR u.id = m.receiver_id)
    WHERE (m.sender_id = ? OR m.receiver_id = ?)
      AND u.id != ?
    GROUP BY u.id
  `).all(userId, userId, userId, userId);

  res.json(conversations);
});

app.get("/api/chat/unread-count", (req, res) => {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const result = db.prepare("SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0").get(userId);
  res.json({ count: result.count });
});

// Catch-all for undefined API routes to prevent HTML fallback
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.url}` });
});

// Global error handler for API routes
app.use("/api", (err: any, req: any, res: any, next: any) => {
  console.error("API Error:", err);
  res.status(err.status || 500).json({ 
    error: err.message || "Internal Server Error",
    details: process.env.NODE_ENV !== "production" ? err.stack : undefined
  });
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
