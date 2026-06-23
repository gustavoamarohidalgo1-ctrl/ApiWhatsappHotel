import { config } from "./config.js";

const processedMessageIds = new Set();
const MAX_PROCESSED_IDS = 500;

function rememberMessageId(messageId) {
  processedMessageIds.add(messageId);

  if (processedMessageIds.size > MAX_PROCESSED_IDS) {
    const first = processedMessageIds.values().next().value;
    processedMessageIds.delete(first);
  }
}

export function verifyWebhook(query) {
  const mode = query["hub.mode"];
  const token = query["hub.verify_token"];
  const challenge = query["hub.challenge"];

  if (mode === "subscribe" && token === config.whatsapp.verifyToken) {
    return { ok: true, challenge };
  }

  return { ok: false };
}

export function extractIncomingMessages(payload) {
  const messages = [];

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const contactsByWaId = new Map(
        (value.contacts || []).map((contact) => [
          contact.wa_id,
          contact.profile?.name || ""
        ])
      );

      for (const message of value.messages || []) {
        if (!message.id || processedMessageIds.has(message.id)) {
          continue;
        }

        const text = getMessageText(message);
        if (!text) {
          continue;
        }

        rememberMessageId(message.id);

        messages.push({
          id: message.id,
          from: message.from,
          name: contactsByWaId.get(message.from) || "",
          text,
          timestamp: message.timestamp,
          type: message.type
        });
      }
    }
  }

  return messages;
}

function getMessageText(message) {
  if (message.type === "text") {
    return message.text?.body?.trim() || "";
  }

  if (message.type === "button") {
    return message.button?.text?.trim() || "";
  }

  if (message.type === "interactive") {
    return (
      message.interactive?.button_reply?.title?.trim() ||
      message.interactive?.list_reply?.title?.trim() ||
      ""
    );
  }

  return "";
}

export async function sendWhatsAppText(to, body) {
  if (!config.whatsapp.accessToken || !config.whatsapp.phoneNumberId) {
    console.warn("WhatsApp credentials missing; message not sent.");
    return { skipped: true };
  }

  const chunks = splitWhatsAppText(body);
  const results = [];

  for (const chunk of chunks) {
    const url = `https://graph.facebook.com/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.whatsapp.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: {
          preview_url: false,
          body: chunk
        }
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(`WhatsApp send failed: ${response.status} ${JSON.stringify(data)}`);
    }

    results.push(data);
  }

  return results;
}

export async function sendWhatsAppImage(to, imageUrl, caption = "") {
  if (!config.whatsapp.accessToken || !config.whatsapp.phoneNumberId) {
    console.warn("WhatsApp credentials missing; image not sent.");
    return { skipped: true };
  }

  const url = `https://graph.facebook.com/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.whatsapp.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "image",
      image: {
        link: imageUrl,
        caption
      }
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`WhatsApp image send failed: ${response.status} ${JSON.stringify(data)}`);
  }

  return data;
}

function splitWhatsAppText(text) {
  const maxLength = 3500;
  const chunks = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    const cutAt = remaining.lastIndexOf("\n", maxLength);
    const index = cutAt > 500 ? cutAt : maxLength;
    chunks.push(remaining.slice(0, index).trim());
    remaining = remaining.slice(index).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}
