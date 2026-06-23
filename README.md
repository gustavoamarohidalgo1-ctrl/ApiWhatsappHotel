# ApiWhatsappHotel

Chatbot de WhatsApp con IA para un hotel. Puede recibir mensajes desde Twilio WhatsApp o desde WhatsApp Cloud API de Meta, generar respuestas con OpenAI y responder al cliente.

## Requisitos

- Node.js 20 o superior
- Cuenta de Twilio con WhatsApp Sandbox o WhatsApp Sender aprobado
- API key de OpenAI

## Instalacion

```bash
npm install
cp .env.example .env
```

Edita `.env` con tus datos reales:

```bash
WHATSAPP_PROVIDER=twilio
OPENAI_API_KEY=sk-...
HOST=127.0.0.1
TWILIO_AUTH_TOKEN=token-de-twilio
TWILIO_VALIDATE_WEBHOOKS=false
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
PUBLIC_BASE_URL=https://tu-url-de-ngrok-o-dominio
```

En hosting, si la plataforma lo requiere, usa `HOST=0.0.0.0`.

## Ejecutar

```bash
npm run dev
```

Servidor local:

```text
http://localhost:3000
```

## Probar sin WhatsApp

Puedes simular una conversacion local:

```bash
curl -X POST http://localhost:3000/simulate \
  -H "Content-Type: application/json" \
  -d '{"from":"cliente-demo","text":"Hola, quiero una habitacion doble para manana"}'
```

## Configurar con Twilio WhatsApp Sandbox

1. Entra a Twilio Console.
2. Ve a **Messaging > Try it out > Send a WhatsApp message**.
3. Activa el Sandbox de WhatsApp.
4. Desde tu celular, envia el mensaje `join ...` al numero sandbox que Twilio te muestra.
5. Expone tu servidor local con ngrok:

```bash
ngrok http 3000
```

6. Copia la URL publica de ngrok y en Twilio pon:

```text
When a message comes in:
https://TU-URL-DE-NGROK/twilio/webhook
Method: POST
```

7. Envia un WhatsApp al numero sandbox de Twilio. El bot deberia responder.

Para produccion, registra un WhatsApp Sender propio del hotel en Twilio. El Sandbox es solo para pruebas.

Cuando ya uses dominio real, puedes cambiar `TWILIO_VALIDATE_WEBHOOKS=true` para validar que los webhooks realmente vengan de Twilio. En ese caso, `PUBLIC_BASE_URL` debe coincidir con la URL publica configurada en Twilio.

## Configurar webhook en Meta

En Meta Developers, en la seccion WhatsApp > Configuration:

- Callback URL: `https://TU-DOMINIO/webhook`
- Verify token: el mismo valor de `WHATSAPP_VERIFY_TOKEN`
- Suscribete al campo `messages`

Para desarrollo local necesitas exponer tu servidor con una URL publica, por ejemplo con ngrok:

```bash
ngrok http 3000
```

Luego usa:

```text
https://TU-URL-DE-NGROK/webhook
```

## Personalizar datos del hotel

Edita:

```text
data/hotel.json
```

Alli puedes cambiar nombre, direccion, precios, tipos de habitacion, politicas y servicios.

## Flujo real de Viscas

El bot ya esta ajustado para este flujo:

```text
Cliente:
Hola, quiero mas informacion.

Viscas:
Muchas gracias por comunicarse con Viscas Luxury Resort & Spa. Sera un gusto ayudarle con la informacion.
Para brindarle una cotizacion personalizada, por favor indiquenos:
• Fecha tentativa de llegada
• Numero de noches
• Numero de personas

Cliente:
• Fecha tentativa de llegada: 10 de julio
• Numero de noches: 2
• Numero de personas: 2

Viscas:
Perfecto, muchas gracias por la informacion.
Le compartimos nuestras opciones de habitaciones para su estadia
```

Despues de ese ultimo mensaje, el bot adjunta los 4 flyers de habitaciones.

## Imagenes locales de Viscas

Las imagenes locales se guardan en:

```text
public/images/viscas/
```

Flyers configurados:

```text
public/images/viscas/luxury-suite-privado.png
public/images/viscas/luxury-suite-matrimonial.png
public/images/viscas/matrimonial-huascaran.png
public/images/viscas/matrimonial-andes.png
```

## Importante para reservas

El bot no confirma reservas automaticamente. Primero recopila datos y deriva a recepcion para validar disponibilidad real. Para confirmar reservas de forma automatica, conecta este proyecto a tu PMS, base de datos, Google Sheets o sistema de reservas.

## Endpoints

- `GET /health`: estado del servidor
- `GET /webhook`: verificacion de Meta
- `POST /webhook`: recepcion de mensajes de WhatsApp
- `POST /twilio/webhook`: recepcion de mensajes desde Twilio WhatsApp
- `POST /simulate`: prueba local sin enviar WhatsApp
