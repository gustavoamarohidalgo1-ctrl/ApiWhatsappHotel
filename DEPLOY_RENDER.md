# Deploy en Render

Esta es la forma recomendada para dejar el bot activo con una URL HTTPS fija.

## 1. Subir el proyecto a GitHub

Render despliega desde un repositorio. Sube esta carpeta a GitHub.

## 2. Crear Web Service en Render

En Render:

1. Ve a `New > Web Service`.
2. Conecta el repositorio de GitHub.
3. Usa estos valores:

```text
Language: Node
Build Command: npm install
Start Command: npm start
```

Para produccion, escoge un plan pagado pequeno como `Starter`, porque el plan gratis puede dormirse si no recibe trafico.

## 3. Variables de entorno

Agrega estas variables en Render:

```env
HOST=0.0.0.0
WHATSAPP_PROVIDER=meta
WHATSAPP_VERIFY_TOKEN=elige-un-token-privado
WHATSAPP_ACCESS_TOKEN=token-de-meta
WHATSAPP_PHONE_NUMBER_ID=id-del-numero-de-whatsapp
WHATSAPP_API_VERSION=v25.0
PUBLIC_BASE_URL=https://tu-servicio.onrender.com
OPENAI_API_KEY=
```

`PUBLIC_BASE_URL` debe ser la URL final que Render te da. Ejemplo:

```text
https://api-whatsapp-viscas.onrender.com
```

## 4. Configurar webhook en Meta

En Meta Developers, configura:

```text
Callback URL: https://tu-servicio.onrender.com/webhook
Verify token: el mismo WHATSAPP_VERIFY_TOKEN
```

Suscribe el evento:

```text
messages
```

## 5. Probar

Abre:

```text
https://tu-servicio.onrender.com/health
```

Debe responder JSON con `ok: true`.

Luego escribe al WhatsApp oficial del hotel:

```text
Hola, quiero mas informacion.
```

El bot debe pedir fecha tentativa de llegada, numero de noches y numero de personas.
