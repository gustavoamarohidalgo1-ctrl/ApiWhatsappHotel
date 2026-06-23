import twilio from "twilio";
import { config } from "./config.js";

const MessagingResponse = twilio.twiml.MessagingResponse;
const processedMessageIds = new Set();
const MAX_PROCESSED_IDS = 500;

function rememberMessageId(messageId) {
  processedMessageIds.add(messageId);

  if (processedMessageIds.size > MAX_PROCESSED_IDS) {
    const first = processedMessageIds.values().next().value;
    processedMessageIds.delete(first);
  }
}

export function extractTwilioIncomingMessage(body) {
  const id = body.MessageSid || body.SmsMessageSid || "";

  if (id && processedMessageIds.has(id)) {
    return { duplicate: true };
  }

  if (id) rememberMessageId(id);

  const text = String(body.Body || body.ButtonText || "").trim();
  const from = String(body.From || "").trim();
  const to = String(body.To || "").trim();

  if (!from) return null;

  return {
    id,
    from,
    to,
    text,
    name: String(body.ProfileName || "").trim(),
    mediaCount: Number(body.NumMedia || 0)
  };
}

export function buildTwilioReplyXml(message) {
  const response = new MessagingResponse();

  if (Array.isArray(message)) {
    for (const item of message) {
      appendTwilioMessage(response, item);
    }

    return response.toString();
  }

  appendTwilioMessage(response, message);

  return response.toString();
}

function appendTwilioMessage(response, message) {
  if (typeof message === "string" && message) {
    response.message(message);
  } else if (message?.body || message?.mediaUrls?.length) {
    if (message.body && message.mediaUrls?.length > 1) {
      response.message(message.body);

      for (const mediaUrl of message.mediaUrls) {
        response.message().media(mediaUrl);
      }

      return;
    }

    const twilioMessage = response.message();

    if (message.body) {
      twilioMessage.body(message.body);
    }

    for (const mediaUrl of message.mediaUrls || []) {
      twilioMessage.media(mediaUrl);
    }
  }
}

export function validateTwilioWebhook(req) {
  if (!config.twilio.validateWebhooks) return true;
  if (!config.twilio.authToken) return false;

  const signature = req.header("X-Twilio-Signature");
  if (!signature) return false;

  const publicUrl = config.publicBaseUrl
    ? new URL(req.originalUrl, config.publicBaseUrl).toString()
    : `${req.protocol}://${req.get("host")}${req.originalUrl}`;

  return twilio.validateRequest(
    config.twilio.authToken,
    signature,
    publicUrl,
    req.body
  );
}
