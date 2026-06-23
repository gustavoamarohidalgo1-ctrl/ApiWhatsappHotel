import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config, getMissingProductionConfig } from "./config.js";
import { buildViscasReply } from "./viscas.js";
import {
  buildTwilioReplyXml,
  extractTwilioIncomingMessage,
  validateTwilioWebhook
} from "./twilio.js";
import {
  extractIncomingMessages,
  sendWhatsAppImage,
  sendWhatsAppText,
  verifyWebhook
} from "./whatsapp.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public");

const app = express();

app.set("trust proxy", true);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use("/images", express.static(path.join(publicDir, "images")));

app.get("/", (_req, res) => {
  res.json({
    name: "ApiWhatsappHotel",
    status: "ok",
    provider: config.whatsappProvider,
    endpoints: ["/health", "/twilio/webhook", "/webhook", "/simulate"]
  });
});

app.get("/health", (_req, res) => {
  const missing = getMissingProductionConfig();

  res.json({
    ok: true,
    provider: config.whatsappProvider,
    whatsappReady: !missing.some((item) => {
      return item.startsWith("WHATSAPP_") || item.startsWith("TWILIO_");
    }),
    openaiReady: !missing.includes("OPENAI_API_KEY"),
    missing
  });
});

app.get("/webhook", (req, res) => {
  const verification = verifyWebhook(req.query);

  if (!verification.ok) {
    return res.sendStatus(403);
  }

  return res.status(200).send(verification.challenge);
});

app.post("/webhook", (req, res) => {
  res.sendStatus(200);

  handleWhatsAppWebhook(req.body).catch((error) => {
    console.error("Webhook processing error:", error);
  });
});

app.post("/twilio/webhook", async (req, res) => {
  try {
    if (!validateTwilioWebhook(req)) {
      return res.sendStatus(403);
    }

    const incoming = extractTwilioIncomingMessage(req.body);

    if (incoming?.duplicate) {
      return res.type("text/xml").send(buildTwilioReplyXml(""));
    }

    if (!incoming?.text) {
      const reply = "Gracias por escribirnos. Por ahora puedo ayudarte mejor si me envias tu consulta en texto.";
      return res.type("text/xml").send(buildTwilioReplyXml(reply));
    }

    console.log(`Incoming Twilio WhatsApp message from ${incoming.from}: ${incoming.text}`);

    const reply = buildViscasReply({
      customerId: incoming.from,
      text: incoming.text,
      toPublicUrl: (pathname) => buildPublicUrl(req, pathname)
    });

    return res.type("text/xml").send(buildTwilioReplyXml(reply));
  } catch (error) {
    console.error("Twilio webhook processing error:", error);

    const reply = "Gracias por escribirnos. En este momento tuvimos un problema tecnico, pero recepcion puede ayudarte en breve.";
    return res.type("text/xml").send(buildTwilioReplyXml(reply));
  }
});

app.post("/simulate", async (req, res) => {
  const from = String(req.body?.from || "cliente-demo");
  const text = String(req.body?.text || "").trim();

  if (!text) {
    return res.status(400).json({ error: "Field 'text' is required." });
  }

  const reply = buildViscasReply({
    customerId: from,
    text,
    toPublicUrl: (pathname) => new URL(pathname, "http://localhost:3000").toString()
  });

  return res.json({ from, text, reply });
});

async function handleWhatsAppWebhook(payload) {
  const messages = extractIncomingMessages(payload);

  for (const message of messages) {
    console.log(`Incoming WhatsApp message from ${message.from}: ${message.text}`);

    const reply = buildViscasReply({
      customerId: message.from,
      text: message.text,
      toPublicUrl: buildConfiguredPublicUrl
    });

    await sendWhatsAppReply(message.from, reply);
  }
}

function buildPublicUrl(req, pathname) {
  const baseUrl = config.publicBaseUrl || `${req.protocol}://${req.get("host")}`;
  return new URL(pathname, baseUrl).toString();
}

function buildConfiguredPublicUrl(pathname) {
  const baseUrl = config.publicBaseUrl || `http://localhost:${config.port}`;
  return new URL(pathname, baseUrl).toString();
}

async function sendWhatsAppReply(to, reply) {
  if (typeof reply === "string") {
    await sendWhatsAppText(to, reply);
    return;
  }

  if (reply.body) {
    await sendWhatsAppText(to, reply.body);
  }

  for (const mediaUrl of reply.mediaUrls || []) {
    await sendWhatsAppImage(to, mediaUrl);
  }
}

app.listen(config.port, config.host, () => {
  const missing = getMissingProductionConfig();
  console.log(`ApiWhatsappHotel listening on http://${config.host}:${config.port}`);

  if (missing.length) {
    console.log(`Missing production config: ${missing.join(", ")}`);
    console.log("Local simulation still works with POST /simulate.");
  }
});
