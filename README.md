# BlindWay

**BlindWay** es una aplicación móvil desarrollada con tecnologías web modernas que busca mejorar la autonomía de personas con discapacidad visual en entornos interiores, como centros educativos. Utiliza balizas Bluetooth Low Energy (BLE) para ofrecer una navegación guiada más precisa que el GPS, proporcionando indicaciones auditivas y visuales adaptadas para facilitar un desplazamiento seguro y autónomo.

## 🎯 Objetivo

El propósito de BlindWay es **reducir barreras arquitectónicas**, **fomentar la independencia** de las personas con discapacidad visual y **mejorar la accesibilidad e inclusión** en espacios interiores.

---

## 🚀 Funcionalidades principales

- 📍 **Navegación en interiores precisa** con balizas BLE.
- 🧭 **Indicaciones auditivas y visuales** adaptadas a las necesidades del usuario.
- 🆘 **Modo de emergencia** para solicitar ayuda rápidamente.
- 🎙️ **Text-to-Speech (TTS)** para convertir texto en voz en tiempo real.
- 📞 **Llamadas directas desde la app** a contactos de emergencia.
- 🔒 **Almacenamiento local seguro** para preferencias del usuario y datos offline.
- ♿ Accesibilidad optimizada desde el diseño.

---

## 🧪 Tecnologías utilizadas

### 🔧 Tecnologías principales

| Tecnología | Versión | Descripción |
|-----------|---------|-------------|
| **Ionic Framework** (`@ionic/angular`) | ^8.0.0 | Framework de desarrollo híbrido con soporte multiplataforma. |
| **Angular** | 19.2.7 | Framework frontend SPA basado en componentes y servicios. |
| **Capacitor** | 7.2.0 | Plataforma de ejecución nativa para apps Ionic (Android/iOS). |
| **Cordova Plugin - Call Number** | - | Permite realizar llamadas desde la app. |

### 📦 Librerías y plugins relevantes

- **@capacitor-community/bluetooth-le**: Comunicación con dispositivos BLE.
- **@capacitor-community/text-to-speech**: Conversión de texto a voz.
- **@ionic/storage** + `localforage`: Persistencia local de datos.
- **Capacitor Plugins**:
  - `Media`
  - `Haptics`
  - `Geolocation`
  - `Keyboard`
  - `Motion`
  - `Screen Orientation`
  - `StatusBar`

- **RxJS**: Programación reactiva para eventos y asincronía.
- **Zone.js**: Detección de cambios en Angular.

---

## 📲 Instalación y ejecución

> Requiere Node.js, Ionic CLI y Android Studio o Xcode según plataforma.

```bash
# Clonar el repositorio
git clone https://github.com/usuario/blindway.git
cd blindway

# Instalar dependencias
npm install

# Ejecutar en navegador (modo desarrollo)
ionic serve

# Construir para Android/iOS
ionic build
npx cap sync
npx cap open android   # o: npx cap open ios
