import express from "express";
import multer from "multer";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const ALLOWED = new Set([
  "https://carlospasa.github.io",
  "http://localhost",
  "http://127.0.0.1"
]);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && ALLOWED.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

// 🔹 Ruta raíz (MUY IMPORTANTE)
app.get("/", (req, res) => {
  res.json({ ok: true, service: "backend-album" });
});

// 🔹 Health check
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/upload", upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "Falta photo" });
    }

    const form = new FormData();
    form.append("chat_id", CHAT_ID);
    // 👇 enviar como DOCUMENTO para evitar compresión
    form.append("document", new Blob([req.file.buffer]), req.file.originalname || "photo.jpg");

    const sendResp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
      method: "POST",
      body: form
    });

    const sendJson = await sendResp.json();
    if (!sendJson.ok) {
      return res.status(502).json({ ok: false, error: "Telegram sendPhoto failed", details: sendJson });
    }

    const file_id = sendJson.result.document.file_id;

    const getResp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${encodeURIComponent(file_id)}`);
    const getJson = await getResp.json();
    if (!getJson.ok) {
      return res.status(502).json({ ok: false, error: "Telegram getFile failed", details: getJson });
    }

    const file_path = getJson.result.file_path;
    const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file_path}`;

    res.json({ ok: true, file_id, file_path, url });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Servidor escuchando en puerto", port));
