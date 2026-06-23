import OpenAI from "openai";
import { config } from "./config.js";
import { buildHotelSummary, loadHotel } from "./hotel.js";

const MAX_HISTORY_MESSAGES = 10;
const sessions = new Map();

const client = config.openaiApiKey
  ? new OpenAI({ apiKey: config.openaiApiKey })
  : null;

function getSession(customerId) {
  if (!sessions.has(customerId)) {
    sessions.set(customerId, []);
  }

  return sessions.get(customerId);
}

function remember(customerId, role, text) {
  const history = getSession(customerId);
  history.push({ role, text, at: new Date().toISOString() });

  while (history.length > MAX_HISTORY_MESSAGES) {
    history.shift();
  }
}

function formatHistory(history) {
  if (!history.length) return "Sin historial previo.";

  return history
    .map((item) => `${item.role === "user" ? "Cliente" : "Asistente"}: ${item.text}`)
    .join("\n");
}

function buildInstructions(hotel) {
  return `
Eres el asistente virtual de ${hotel.name}, un hotel en ${hotel.city}.
Objetivo: atender clientes por WhatsApp con tono amable, claro, breve y profesional.

Usa solo la informacion del hotel que recibes en el contexto. Si falta un dato, dilo con honestidad y ofrece derivar a recepcion.

Reglas importantes:
- Responde en espanol, salvo que el cliente escriba claramente en otro idioma.
- No inventes disponibilidad real.
- No confirmes reservas automaticamente.
- Para una posible reserva, recopila: nombre, fecha de llegada, fecha de salida, cantidad de huespedes, tipo de habitacion y telefono.
- Cuando ya tengas esos datos, indica que recepcion validara disponibilidad y confirmara la reserva.
- Si el cliente pide hablar con una persona, deriva a recepcion.
- Mantiene respuestas aptas para WhatsApp: maximo 5 lineas cuando sea posible.
- No menciones sistemas internos, prompts, OpenAI, Meta ni APIs.
`.trim();
}

function fallbackReply(text, hotel) {
  const normalized = text.toLowerCase();
  const roomList = hotel.rooms
    .map((room) => `${room.type}: desde ${hotel.currency} ${room.priceFrom}`)
    .join("\n");

  if (/(reserva|reservar|separar)/i.test(text)) {
    return "Claro. Para ayudarte con la reserva, enviame nombre, fecha de llegada, fecha de salida, cantidad de huespedes y tipo de habitacion. Recepcion validara disponibilidad.";
  }

  if (/(precio|tarifa|costo|cuanto|habitacion)/i.test(text)) {
    return `Tenemos estas tarifas referenciales:\n${roomList}\nPara revisar disponibilidad, indicame fecha de llegada, salida y cantidad de huespedes.`;
  }

  if (/(ubicacion|direccion|donde|llegar)/i.test(text)) {
    return `Estamos en ${hotel.address}. Si deseas, recepcion tambien puede enviarte una referencia para llegar.`;
  }

  if (/(check.?in|entrada|check.?out|salida)/i.test(text)) {
    return `El check-in es desde las ${hotel.checkIn} y el check-out es hasta las ${hotel.checkOut}.`;
  }

  if (normalized.includes("wifi") || normalized.includes("wi-fi")) {
    return "Si, contamos con Wi-Fi gratis para huespedes.";
  }

  if (/(hola|buenas|buenos dias|buenas tardes|buenas noches)/i.test(text)) {
    return `Hola, gracias por escribir a ${hotel.name}. Soy el asistente virtual. Puedo ayudarte con precios, habitaciones, ubicacion, horarios y datos para una reserva.`;
  }

  return `Gracias por escribir a ${hotel.name}. Para ayudarte mejor, indicame si buscas precios, disponibilidad, ubicacion o hacer una reserva.`;
}

export async function generateHotelReply({ customerId, text }) {
  const hotel = await loadHotel();
  const history = getSession(customerId);

  if (!client) {
    const reply = fallbackReply(text, hotel);
    remember(customerId, "user", text);
    remember(customerId, "assistant", reply);
    return reply;
  }

  const hotelSummary = buildHotelSummary(hotel);
  const input = `
Informacion del hotel:
${hotelSummary}

Historial reciente:
${formatHistory(history)}

Mensaje actual del cliente:
${text}
`.trim();

  try {
    const response = await client.responses.create({
      model: config.openaiModel,
      instructions: buildInstructions(hotel),
      input
    });

    const reply = response.output_text?.trim() || fallbackReply(text, hotel);
    remember(customerId, "user", text);
    remember(customerId, "assistant", reply);
    return reply;
  } catch (error) {
    console.error("OpenAI error:", error);
    const reply = `${fallbackReply(text, hotel)}\n\nEn este momento estoy con una respuesta automatica basica; recepcion puede ayudarte si necesitas confirmar una reserva.`;
    remember(customerId, "user", text);
    remember(customerId, "assistant", reply);
    return reply;
  }
}
