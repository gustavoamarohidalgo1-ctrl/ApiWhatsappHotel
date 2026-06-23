import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const hotelPath = path.join(__dirname, "..", "data", "hotel.json");

let cachedHotel = null;

export async function loadHotel() {
  if (cachedHotel) return cachedHotel;

  const raw = await readFile(hotelPath, "utf8");
  cachedHotel = JSON.parse(raw);
  return cachedHotel;
}

export function buildHotelSummary(hotel) {
  const rooms = hotel.rooms
    .map((room) => {
      return `- ${room.type}: capacidad ${room.capacity}, desde ${hotel.currency} ${room.priceFrom}. ${room.description}`;
    })
    .join("\n");

  return `
Hotel: ${hotel.name}
Ciudad: ${hotel.city}
Direccion: ${hotel.address}
Telefono: ${hotel.phone}
WhatsApp: ${hotel.whatsapp}
Email: ${hotel.email}
Check-in: ${hotel.checkIn}
Check-out: ${hotel.checkOut}
Servicios: ${hotel.amenities.join(", ")}
Politicas:
- Cancelacion: ${hotel.policies.cancellation}
- Mascotas: ${hotel.policies.pets}
- Ninos: ${hotel.policies.children}
- Pago: ${hotel.policies.payment}
Habitaciones:
${rooms}
`.trim();
}
