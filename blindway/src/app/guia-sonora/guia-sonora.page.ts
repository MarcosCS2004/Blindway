/****************************************************************************************
 *  GuiaSonoraPage – Navegación sonora asistida por balizas BLE + brújula + GPS
 *
 *  • Escanea balizas BLE filtradas por MAC
 *  • Calcula la dirección real (bearing) usando GPS + heading del dispositivo
 *  • Indica al usuario con voz y vibración cómo orientarse
 *  • Mensajes personalizados cuando el usuario está muy cerca (< 1,5 m)
 ****************************************************************************************/

import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Motion } from '@capacitor/motion';
import { Router, NavigationStart } from '@angular/router';
import { Subscription } from 'rxjs';
import { Geolocation } from '@capacitor/geolocation';

// Estructura de datos que representa una baliza BLE */
interface Beacon {
  name: string;
  address: string;
  rssi: number;
  distance: number;
  lastSeen: Date;
  latitude: number;
  longitude: number;
}

@Component({
  selector: 'app-guia-sonora',
  templateUrl: './guia-sonora.page.html',
  styleUrls: ['./guia-sonora.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})

export class GuiaSonoraPage implements OnInit, OnDestroy {

  beacons: Beacon[] = []; // Balizas detectadas ordenadas por distancia
  isScanning = false;     // Flag de escaneo BLE activo
  signalStrength = 0;     // RSSI en % de la baliza seleccionada
  directionAngle = 0;     // Ángulo suavizado para la flecha (0–360 °)
  currentHeading = 0;     // Rumbo del dispositivo (brújula α)
  currentPosition: { latitude: number, longitude: number } | null = null; // Posición GPS

  selectedBeacon: Beacon | null = null; // Baliza Seleccionada
  signalReliability: 'Alta' | 'Media' | 'Baja' = 'Alta'; // Calidad de señal

  // Manejadores / ids para cancelar listeners e intervalos 
  private motionHandle?: any;
  private scanTimeout: any;
  private visualInterval: any = null;
  private soundInterval: any = null;
  private vibrationInterval: any = null;
  private geoWatchId: string | null = null;

  // Timestamps y cache para cooldowns / suavizados 
  private lastVibrationTime = 0;
  private lastPulseRate = 0;
  private lastNotificationTime = 0;

  // Utilidades de navegación y filtro de RSSI 
  private navigationSub?: Subscription;
  private rssiHistory: { [mac: string]: number[] } = {};

  // Controla qué balizas ya han emitido su mensaje “has llegado” 
  private notifiedBeacons: { [mac: string]: boolean } = {};

  // Whitelist de MACs válidas 
  allowedMacs = [
    'D8:DE:11:70:B3:0A',
    'F7:31:A1:31:5E:5B',
    'D7:9B:16:04:4C:C0',
    'F5:16:21:95:E9:C2',
    'E3:B3:F9:53:28:5F'
  ];

  constructor(
    private alertController: AlertController,
    private router: Router,
    private ngZone: NgZone
  ) {}

  //────────────────────────── CICLO DE VIDA ──────────────────────────
  ngOnInit() {
    // 1) Posición inicial y watcher de GPS
    this.updateCurrentPosition();
    this.startWatchingPosition();

    // 2) Sensores y procesos principales
    this.initializeBle();
    this.startCompass();
    this.startVisualUpdater();
    this.startSoundGuidance();

    // 3) Mensaje de bienvenida y cleanup si se navega fuera
    this.speak('Guía visual iniciada.');
    this.navigationSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.cleanUp();
      }
    });
  }

  async ngOnDestroy() {
    await this.cleanUp();
    this.navigationSub?.unsubscribe();
  }

  ionViewWillLeave() {
    this.cleanUp();
  }

  //─────────────────────────── LIMPIEZA ───────────────────────────

  // Detiene todos los sensores, intervalos y audio activos 
  private async cleanUp() {
    await TextToSpeech.stop();   // Corta cualquier voz en curso
    this.stopScan();
    this.stopVisualUpdater();
    this.stopSoundGuidance();
    this.stopPulsedVibration();
    
     // Detiene watcher GPS
    if (this.geoWatchId) {                          
      Geolocation.clearWatch({ id: this.geoWatchId });
      this.geoWatchId = null;
    }

     // Detiene brújula
    if (this.motionHandle) {
      await this.motionHandle.remove();
      this.motionHandle = undefined;
    }

    // Asegura parar BLE
    BleClient.stopLEScan().catch(() => {});
    this.speak('Guía sonora detenida.');
  }

  //────────────────────────── INICIALIZAR BLE ──────────────────────────
  private async initializeBle() {
    try {
      await BleClient.initialize();
      this.speak('Buscando Balizas');
    } catch (error) {
      console.error(error);
      this.speak('Error al inicializar Bluetooth.');
    }
  }

  //────────────────────────── UTILIDADES DE VOZ & VIBRACIÓN ─────────────────

  // Habla usando TTS – detiene primero cualquier mensaje previo 
  private async speak(text: string) {
    try {
      await TextToSpeech.stop(); 
      await TextToSpeech.speak({ text, lang: 'es-ES', rate: 1.0, pitch: 1.0, volume: 1.0 });
    } catch (e) {
      console.warn('TTS fallo', e);
    }
  }

  // Vibración con cooldown de 2 s para no saturar 
  private async vibrate(style: ImpactStyle) {
    const now = Date.now();
    if (now - this.lastVibrationTime > 2000) {
      await Haptics.impact({ style });
      this.lastVibrationTime = now;
    }
  }

  //─────────────────────── BRÚJULA (Motion API) ───────────────────────

  // Escucha eventos de orientación absoluta y actualiza currentHeading 
  async startCompass() {
    try {
      // En iOS WebView hay que pedir permiso explícito
      const permission = (DeviceOrientationEvent as any)?.requestPermission;
      if (permission) {
        const result = await permission();
        if (result !== 'granted') return;
      }

      const listener = await Motion.addListener('orientation', (event: any) => {
        const alpha = event.alpha;
        if (alpha !== undefined && alpha !== null) {
          this.currentHeading = alpha;  // 0–360°
          this.updateDirection();       // Recalcula flecha en tiempo real
        }
      });

      this.motionHandle = listener;
    } catch (error) {
      console.error('Error al iniciar la brújula', error);
    }
  }

  //─────────────────────────── ESCANEO BLE ───────────────────────────

  // Inicia el escaneo con filtro de MACs y timeout de 15 s 
  async startScan() {
    if (this.isScanning) return;
    this.isScanning = true;
    this.speak('Escaneo iniciado...');
    this.vibrate(ImpactStyle.Light);
    this.beacons = [];
    this.rssiHistory = {};

    // Solicita permiso de localización si es necesario
    try {
      const perm = await navigator.permissions.query({ name: 'geolocation' as any }).catch(() => null);
      if (perm && perm.state !== 'granted') {
        console.warn('Falta permiso de ubicación');
      }
    } catch {}

    // Comienza el LE Scan
    await BleClient.requestLEScan({}, result => {
      const mac = result.device.deviceId?.toUpperCase();
      if (!mac) return;
      // Ejecuta en zona Angular para refrescar UI
      this.ngZone.run(() => this.processBeacon({ ...result, device: { deviceId: mac } }));
    });

    // Detén escaneo a los 15 s
    this.scanTimeout = setTimeout(() => {
      this.stopScan();
      if (this.beacons.length === 0) {
        this.showNoBeaconsAlert();
      } else if (!this.selectedBeacon) {
        this.selectedBeacon = this.beacons[0]; // Selecciona la más cercana
      }
    }, 15000);
  }

  // Detiene el escaneo y limpia timeout 
  stopScan() {
    BleClient.stopLEScan().catch(() => {});
    this.isScanning = false;
    this.speak('Escaneo detenido.');
    this.vibrate(ImpactStyle.Light);
    clearTimeout(this.scanTimeout);
    this.scanTimeout = null;
  }

  // Alerta modal cuando no se encuentran balizas 
  private async showNoBeaconsAlert() {
    const alert = await this.alertController.create({
      header: 'Sin balizas detectadas',
      message: 'No se han encontrado balizas BLE después de 15 segundos.',
      buttons: ['OK']
    });
    await alert.present();
  }

  async showCalibrationTip() {
    // Sugerencia de calibración de brújula
    const alert = await this.alertController.create({
      header: 'Calibración de brújula',
      message: 'Mueve el teléfono en forma de ∞ para mejorar la precisión de orientación.',
      buttons: ['Entendido']
    });
    await alert.present();
  }

  //──────── ACTUALIZADOR VISUAL (señal + orientación) ─────────
  // Intervalo muy rápido (100 ms) para mantener UI y cálculos frescos para un buen apuntado a la baliza
  startVisualUpdater() {
    this.visualInterval = setInterval(() => {
      // Determina qué baliza es la más cercana y cambia si hace falta
      if (this.beacons.length > 0) {
        const closest = this.beacons[0];
        if (!this.selectedBeacon || closest.address !== this.selectedBeacon.address) {
          this.selectedBeacon = closest;
          this.notifiedBeacons = {}; // Vuelve a permitir mensajes de “llegada”
        }
      }

      // Actualiza datos de la baliza seleccionada
      if (this.selectedBeacon) {
        const updated = this.beacons.find(b => b.address === this.selectedBeacon?.address);
        if (updated) {
          this.signalStrength = this.mapRssiToStrength(updated.rssi);
          this.selectedBeacon.rssi = updated.rssi;
          this.selectedBeacon.distance = this.calculateDistance(updated.rssi);
          this.signalReliability = this.getSignalReliability(this.selectedBeacon.address);
          this.updateDirection();
        }
      }
    }, 100);
  }

  //────────────────────── GUÍA SONORA CADA 1,5 s ──────────────────────

  // Muestra mensaje de llegada a la baliza y una vibración
  startSoundGuidance() {
    this.soundInterval = setInterval(() => {
      if (!this.selectedBeacon) return;

      const distance = this.selectedBeacon.distance || 99;
      const angleDiff = Math.abs(this.normalizeAngle(this.directionAngle));
      const now = Date.now();
      const speakCooldown = 5000; // Cooldown mensajes orientación
      const mac = this.selectedBeacon.address;

      // Lógica personalizada si estás MUY cerca de la baliza (< 1.5 m) y da un mensaje de “has llegado”
      if (distance < 1.5 && !this.notifiedBeacons[mac]) {
        const customMessage = this.getCustomArrivalMessage(mac);
        if (customMessage) {
          this.speak(customMessage);
          this.notifiedBeacons[mac] = true;
          this.vibrate(ImpactStyle.Heavy)
          return; // evita seguir con los mensajes de orientación
        }
      }
    }, 1500);
  }

  // Convierte ángulo 0–360 a rango –180…180 (útil para diferencias) 
  private normalizeAngle(angle: number): number {
    let normalized = ((angle + 180) % 360 + 360) % 360 - 180;
    return normalized;
  }

  stopVisualUpdater() {
    if (this.visualInterval) {
      clearInterval(this.visualInterval);
      this.visualInterval = null;
    }
  }

  stopSoundGuidance() {
    if (this.soundInterval) {
      clearInterval(this.soundInterval);
      this.soundInterval = null;
    }
  }

  stopPulsedVibration() {
    if (this.vibrationInterval) {
      clearInterval(this.vibrationInterval);
      this.vibrationInterval = null;
      this.lastPulseRate = 0;
    }
  }
  //────────────────────────── PROCESAR BALIZA ─────────────────────────
  
  // Recibe cada “advertisement” BLE y actualiza/crea la baliza 
  processBeacon(result: any) {
    // Filtra por MAC autorizada
    const mac = result.device.deviceId;
    if (!mac || !this.allowedMacs.includes(mac)) return;

    // Guarda historial de RSSI para suavizar mediciones
    if (!this.rssiHistory[mac]) {
      this.rssiHistory[mac] = [];
    }

    this.rssiHistory[mac].push(result.rssi);
    if (this.rssiHistory[mac].length > 8) {
      this.rssiHistory[mac].shift();
    }

    const avgRssi = this.rssiHistory[mac].reduce((a, b) => a + b) / this.rssiHistory[mac].length;

    const beaconIndex = this.beacons.findIndex(b => b.address === mac);
    const beaconName = this.getCustomName(mac) ?? 'Baliza';

    const coords = this.getBeaconCoordinates(mac);
    if (!coords) return;

    const updatedBeacon = {
      name: beaconName || "Baliza",
      address: mac,
      rssi: avgRssi,
      distance: this.calculateDistance(avgRssi),
      lastSeen: new Date(),
      latitude: coords.latitude,
      longitude: coords.longitude
    };

    if (beaconIndex === -1) {
      this.beacons.push(updatedBeacon);
    } else {
      this.beacons[beaconIndex] = updatedBeacon;
    }

    // Ordena las balizas por distancia
    this.beacons.sort((a, b) => a.distance - b.distance);
  }

  // Nombre Customizado para las valizas
  getCustomName(mac: string): string | null {
    const macNames: { [key: string]: string } = {
      'D8:DE:11:70:B3:0A': 'Escaleras',
      'F7:31:A1:31:5E:5B': 'Cafetería',
      'D7:9B:16:04:4C:C0': 'Salón de Actos',
      'F5:16:21:95:E9:C2': 'Secretaría',
      'E3:B3:F9:53:28:5F': 'Intersección Cafetería y Entrada'
    };
    return macNames[mac] || null;
  }

  // Emite voz, habla según rango, más el suavizado de la flecha para que funcione mejor.
  private updateDirection() {
    if (!this.selectedBeacon || !this.currentPosition) return;

    const beaconLat = this.selectedBeacon.latitude;
    const beaconLng = this.selectedBeacon.longitude;

    const userLat = this.currentPosition.latitude;
    const userLng = this.currentPosition.longitude;

    // Calcula el ángulo real hacia la baliza desde tu posición
    const angleToBeacon = this.getBearing(userLat, userLng, beaconLat, beaconLng);

    // Usa tu orientación actual para calcular la diferencia con respecto al beacon
    const heading = this.currentHeading; // del giroscopio / brújula
    
    // Usa la diferencia real entre beacon y heading
    const targetAngle = (angleToBeacon - heading + 360) % 360;

    // Suavizado (25 % del delta)
    let delta = targetAngle - this.directionAngle;
    delta = ((delta + 540) % 360) - 180;
    this.directionAngle += delta * 0.25;

    const angle = this.directionAngle;
    const now = Date.now();
    const speakCooldown = 4000;
    const vibrationCooldown = 3000;
    
    //Mensajes de voz principales
    if (angle <= 15 || angle >= 345) {
      if (now - this.lastNotificationTime > speakCooldown) {
        this.speak('Estás yendo en la dirección correcta.');
        this.lastNotificationTime = now;
      }
      if (now - this.lastVibrationTime > vibrationCooldown) {
        this.vibrate(ImpactStyle.Medium);
        this.lastVibrationTime = now;
      }
    } else if (angle > 15 && angle < 90) {
      if (now - this.lastNotificationTime > speakCooldown) {
        this.speak('Gira un poco a la izquierda, te estás desviando.');
        this.lastNotificationTime = now;
      }
      if (now - this.lastVibrationTime > vibrationCooldown) {
        this.vibrate(ImpactStyle.Medium);
        this.lastVibrationTime = now;
      }
    } else if (angle > 270 && angle < 345) {
      if (now - this.lastNotificationTime > speakCooldown) {
        this.speak('Gira un poco a la derecha, te estás desviando.');
        this.lastNotificationTime = now;
      }
      if (now - this.lastVibrationTime > vibrationCooldown) {
        this.vibrate(ImpactStyle.Medium);
        this.lastVibrationTime = now;
      }
    } else {
      if (now - this.lastNotificationTime > speakCooldown) {
        this.speak('Te estás alejando. Da la vuelta.');
        this.lastNotificationTime = now;
      }
      if (now - this.lastVibrationTime > vibrationCooldown) {
        this.vibrate(ImpactStyle.Heavy);
        this.lastVibrationTime = now;
      }
    }
  }

  // Vibra en pulsos más rápidos cuanto menor es la distancia 
  /*
  updatePulsedVibration(distance: number) {
    if (distance < 0 || isNaN(distance)) return;

    // Cuanto más cerca, más rápido vibra. Asegura que esté entre 200ms y 2000ms.
    const pulseRate = Math.max(200, Math.min(2000, distance * 1000));

    if (this.vibrationInterval && this.lastPulseRate === pulseRate) return;

    // Reinicia el intervalo si ha cambiado
    if (this.vibrationInterval) {
      clearInterval(this.vibrationInterval);
    }

    this.vibrationInterval = setInterval(() => {
      this.vibrate(ImpactStyle.Medium);
    }, pulseRate);

    this.lastPulseRate = pulseRate;
  }*/

  //────────────────────── CONVERSIÓN RSSI → DISTANCIA ──────────────────

  calculateDistance(rssi: number): number {
    // Estima distancia basada en RSSI (modelo logarítmico)
    const txPower = -59;
    if (rssi === 0) return -1;
    const ratio = rssi / txPower;
    return ratio < 1.0
      ? Math.pow(ratio, 10)
      : 0.89976 * Math.pow(ratio, 7.7095) + 0.111;
  }

  mapRssiToStrength(rssi: number): number {
    // Convierte RSSI en porcentaje de intensidad de señal (0-100)
    if (rssi >= -50) return 100;
    if (rssi <= -100) return 0;
    return Math.round((rssi + 100) * 2);
  }

  getSignalReliability(mac: string): 'Alta' | 'Media' | 'Baja' {
    // Calcula varianza de RSSI para estimar estabilidad de la señal
    const rssiValues = this.rssiHistory[mac];
    if (!rssiValues || rssiValues.length < 3) return 'Baja';

    const avg = rssiValues.reduce((a, b) => a + b) / rssiValues.length;
    const variance = rssiValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / rssiValues.length;

    if (variance < 4) return 'Alta';
    if (variance < 10) return 'Media';
    return 'Baja';
  }

  //──────────────────── GEOUTILS: BEARING & COORDENADAS ────────────────
  
  // Devuelve el bearing entre dos pares lat/lon en grados (0–360)
  private getBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRadians = (deg: number) => deg * Math.PI / 180;
    const toDegrees = (rad: number) => rad * 180 / Math.PI;

    const dLon = toRadians(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRadians(lat2));
    const x = Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
              Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(dLon);

    const brng = Math.atan2(y, x);
    return (toDegrees(brng) + 360) % 360;
  }

  private async updateCurrentPosition() {
    try {
      const position = await Geolocation.getCurrentPosition();
      this.currentPosition = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
    } catch (error) {
      console.error('No se pudo obtener la ubicación actual:', error);
    }
  }

  // Tabla fija MAC → coordenadas
  getBeaconCoordinates(mac: string): { latitude: number, longitude: number } | null {
    const coordinates: { [mac: string]: { latitude: number, longitude: number } } = {
      'D8:DE:11:70:B3:0A': { latitude: 40.4734286, longitude: -3.6974712 }, // Escaleras
      'F7:31:A1:31:5E:5B': { latitude: 40.4734276, longitude: -3.6974739 }, // Cafetería
      'D7:9B:16:04:4C:C0': { latitude: 40.4735414, longitude: -3.6969087 }, // Salón de Actos
      'F5:16:21:95:E9:C2': { latitude: 40.4734276, longitude: -3.6974739 }, // Secretaría
      'E3:B3:F9:53:28:5F': { latitude: 40.4734276, longitude: -3.6974739 }  // Intersección
    };
    return coordinates[mac] || null;
  }
  // Fija desde donde estás haciendo el escaneo
  private async startWatchingPosition() {
    try {
      this.geoWatchId = await Geolocation.watchPosition({}, position => {
        if (position && position.coords) {
          this.currentPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
        }
      });
    } catch (error) {
      console.error('Error al iniciar watchPosition:', error);
    }
  }

  //──────────────────────── MENSAJES PERSONALIZADOS ───────────────────
  
  // Devuelve el mensaje de llegada según la MAC (o null) 
  private getCustomArrivalMessage(mac: string): string | null {
    const messages: { [key: string]: string } = {
      'D8:DE:11:70:B3:0A': 'Has llegado a las escaleras. Planta 1 dirección y planta 2 clases',
      'F7:31:A1:31:5E:5B': 'Estás frente a la cafetería. Más adelante hay escalones ten cuidado',
      'D7:9B:16:04:4C:C0': 'Estás junto al salón de actos. Más adelante hay escalones ten cuidado',
      'F5:16:21:95:E9:C2': 'Has llegado a secretaría.',
      'E3:B3:F9:53:28:5F': 'Estás en el cruce entre la cafetería y la entrada'
    };
    return messages[mac] || null;
  }

}
