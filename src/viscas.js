const conversations = new Map();

export const VISCAS_ROOM_FLYERS = [
  "/images/viscas/luxury-suite-privado.png",
  "/images/viscas/luxury-suite-matrimonial.png",
  "/images/viscas/matrimonial-huascaran.png",
  "/images/viscas/matrimonial-andes.png"
];

const INFO_REQUEST_REPLY = `Muchas gracias por comunicarse con Viscas Luxury Resort & Spa. Será un gusto ayudarle con la información.
Para brindarle una cotización personalizada, por favor indíquenos:
• Fecha tentativa de llegada
• Número de noches
• Número de personas`;

const ROOM_OPTIONS_REPLY = `Perfecto, muchas gracias por la información.
Le compartimos nuestras opciones de habitaciones para su estadía`;

function getConversation(customerId) {
  if (!conversations.has(customerId)) {
    conversations.set(customerId, {
      arrivalDate: "",
      nights: "",
      people: "",
      flyersSent: false
    });
  }

  return conversations.get(customerId);
}

export function buildViscasReply({ customerId, text, toPublicUrl }) {
  const conversation = getConversation(customerId);
  const extracted = extractStayDetails(text);

  conversation.arrivalDate = extracted.arrivalDate || conversation.arrivalDate;
  conversation.nights = extracted.nights || conversation.nights;
  conversation.people = extracted.people || conversation.people;

  if (hasCompleteStayDetails(conversation)) {
    if (!conversation.flyersSent || asksForRoomFlyers(text)) {
      conversation.flyersSent = true;

      return {
        body: ROOM_OPTIONS_REPLY,
        mediaUrls: VISCAS_ROOM_FLYERS.map((flyerPath) => toPublicUrl(flyerPath))
      };
    }
  }

  if (asksForInformation(text) || asksForRoomFlyers(text) || hasPartialStayDetails(conversation)) {
    return INFO_REQUEST_REPLY;
  }

  return INFO_REQUEST_REPLY;
}

function extractStayDetails(text) {
  const normalized = normalize(text);
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[•*-]\s*/, "").trim())
    .filter(Boolean);

  const details = {
    arrivalDate: "",
    nights: "",
    people: ""
  };

  for (const line of lines) {
    const normalizedLine = normalize(line);

    if (!details.arrivalDate && /(fecha|llegada|arribo|entrada)/.test(normalizedLine)) {
      details.arrivalDate = valueAfterSeparator(line);
    }

    if (!details.nights && /noches?/.test(normalizedLine)) {
      details.nights = findNumber(line);
    }

    if (!details.people && /(personas?|huespedes?|adultos?)/.test(normalizedLine)) {
      details.people = findNumber(line);
    }
  }

  if (!details.arrivalDate) {
    details.arrivalDate = findDateLikeText(text);
  }

  if (!details.nights) {
    details.nights = findNumberNear(text, /noches?/i);
  }

  if (!details.people) {
    details.people = findNumberNear(text, /(personas?|huespedes?|adultos?)/i);
  }

  return details;
}

function valueAfterSeparator(text) {
  const parts = text.split(/[:：]/);
  return (parts[1] || parts[0] || "").trim();
}

function findNumber(text) {
  const match = text.match(/\b\d+\b/);
  return match?.[0] || "";
}

function findNumberNear(text, labelRegex) {
  const labelFirst = text.match(new RegExp(`${labelRegex.source}\\D{0,20}(\\d+)`, "i"));
  if (labelFirst) return labelFirst[1];

  const numberFirst = text.match(new RegExp(`(\\d+)\\D{0,20}${labelRegex.source}`, "i"));
  return numberFirst?.[1] || "";
}

function findDateLikeText(text) {
  const match = text.match(
    /\b(\d{1,2}\s*(?:de\s*)?(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b/i
  );

  return match?.[1]?.trim() || "";
}

function hasCompleteStayDetails(conversation) {
  return Boolean(conversation.arrivalDate && conversation.nights && conversation.people);
}

function hasPartialStayDetails(conversation) {
  return Boolean(conversation.arrivalDate || conversation.nights || conversation.people);
}

function asksForInformation(text) {
  const normalized = normalize(text);
  return /(hola|informacion|cotizacion|consulta|reservar|reserva|precio|tarifa)/.test(normalized);
}

function asksForRoomFlyers(text) {
  const normalized = normalize(text);
  return /(habitaciones?|opciones|flyer|imagenes?|fotos?|suite|matrimonial)/.test(normalized);
}

function normalize(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
