import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || "127.0.0.1",
  publicBaseUrl: process.env.PUBLIC_BASE_URL || "",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-5.5",
  botLanguage: process.env.BOT_LANGUAGE || "es",
  whatsappProvider: process.env.WHATSAPP_PROVIDER || "twilio",
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || "",
    authToken: process.env.TWILIO_AUTH_TOKEN || "",
    validateWebhooks: process.env.TWILIO_VALIDATE_WEBHOOKS === "true",
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886"
  },
  whatsapp: {
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "",
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    apiVersion: process.env.WHATSAPP_API_VERSION || "v25.0"
  }
};

export function getMissingProductionConfig() {
  const missing = [];

  if (config.whatsappProvider === "meta") {
    if (!config.whatsapp.verifyToken) missing.push("WHATSAPP_VERIFY_TOKEN");
    if (!config.whatsapp.accessToken) missing.push("WHATSAPP_ACCESS_TOKEN");
    if (!config.whatsapp.phoneNumberId) missing.push("WHATSAPP_PHONE_NUMBER_ID");
  }

  if (config.whatsappProvider === "twilio" && config.twilio.validateWebhooks) {
    if (!config.twilio.authToken) missing.push("TWILIO_AUTH_TOKEN");
  }

  return missing;
}
