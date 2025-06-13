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
  beacons: Beacon[] = [];
  isScanning = false;
  signalStrength = 0;
  directionAngle = 0;
  currentHeading = 0;
  currentPosition: { latitude: number, longitude: number } | null = null;
  selectedBeacon: Beacon | null = null;
  signalReliability: 'Alta' | 'Media' | 'Baja' = 'Alta';
  private motionHandle?: any;
  private scanTimeout: any;
  private visualInterval: any = null;
  private soundInterval: any = null;
  private vibrationInterval: any = null;
  private lastVibrationTime = 0;
  private lastPulseRate = 0;
  private lastNotificationTime = 0;
  private navigationSub?: Subscription;
  private rssiHistory: { [mac: string]: number[] } = {};

  allowedMacs = [
    'D8:DE:11:70:B3:0A',
    'F7:31:A1:31:5E:5B',
    'D7:9B:16:04:4C:C0',
    'F5:16:21:95:E9:C2'
  ];

  constructor(
    private alertController: AlertController,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.updateCurrentPosition();
    this.initializeBle();
    this.startCompass();
    this.startVisualUpdater();
    this.startSoundGuidance();
    this.speak('Guía visual iniciada. Iniciando escaneo de balizas.');

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

  private async cleanUp() {
    this.stopScan();
    this.stopVisualUpdater();
    this.stopSoundGuidance();
    this.stopPulsedVibration();
    if (this.motionHandle) {
      await this.motionHandle.remove();
      this.motionHandle = undefined;
    }
    await TextToSpeech.stop();
    BleClient.stopLEScan().catch(() => {});
    this.speak('Guía sonora detenida.');
  }

  private async initializeBle() {
    try {
      await BleClient.initialize();
      this.speak('Buscando Balizas');
    } catch (error) {
      console.error(error);
      this.speak('Error al inicializar Bluetooth.');
    }
  }

  private async speak(text: string) {
    try {
      await TextToSpeech.speak({ text, lang: 'es-ES', rate: 1.0, pitch: 1.0, volume: 1.0 });
    } catch (e) {
      console.warn('TTS fallo', e);
    }
  }

  private async vibrate(style: ImpactStyle) {
    const now = Date.now();
    if (now - this.lastVibrationTime > 2000) {
      await Haptics.impact({ style });
      this.lastVibrationTime = now;
    }
  }

  async startCompass() {
    try {
      const permission = (DeviceOrientationEvent as any)?.requestPermission;
      if (permission) {
        const result = await permission();
        if (result !== 'granted') return;
      }

      const listener = await Motion.addListener('orientation', (event: any) => {
        const alpha = event.alpha;
        if (alpha !== undefined && alpha !== null) {
          this.currentHeading = alpha;
          this.updateDirection(); 
        }
      });

      this.motionHandle = listener;
    } catch (error) {
      console.error('Error al iniciar la brújula', error);
    }
  }

  async startScan() {
    if (this.isScanning) return;
    this.isScanning = true;
    this.speak('Escaneo iniciado...');
    this.vibrate(ImpactStyle.Light);
    this.beacons = [];
    this.rssiHistory = {};

    try {
      const perm = await navigator.permissions.query({ name: 'geolocation' as any }).catch(() => null);
      if (perm && perm.state !== 'granted') {
        console.warn('Falta permiso de ubicación');
      }
    } catch {}

    await BleClient.requestLEScan({}, result => {
      const mac = result.device.deviceId?.toUpperCase();
      if (!mac) return;
      this.ngZone.run(() => this.processBeacon({ ...result, device: { deviceId: mac } }));
    });

    this.scanTimeout = setTimeout(() => {
      this.stopScan();
      if (this.beacons.length === 0) {
        this.showNoBeaconsAlert();
      } else if (!this.selectedBeacon) {
        this.selectedBeacon = this.beacons[0];
      }
    }, 15000);
  }

  stopScan() {
    BleClient.stopLEScan().catch(() => {});
    this.isScanning = false;
    this.speak('Escaneo detenido.');
    this.vibrate(ImpactStyle.Light);
    clearTimeout(this.scanTimeout);
    this.scanTimeout = null;
  }

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

  async checkAlignmentAndNotify() {
    // Notifica con un sonido si la dirección está alineada (dentro de margen)
    const margin = 2;
    const now = Date.now();
    const cooldown = 2000;
    const normalized = (this.directionAngle % 360 + 360) % 360;

    if ((normalized >= (360 - margin) || normalized <= margin) &&
      now - this.lastNotificationTime > cooldown) {

      this.lastNotificationTime = now;

      const audio = new Audio('assets/sounds/bell.mp3');
      audio.play().catch((e) => console.warn('Error al reproducir sonido', e));
    }
  }

  startVisualUpdater() {
    this.visualInterval = setInterval(async () => {
      await this.updateCurrentPosition(); // 👈 Actualiza la ubicación en cada ciclo

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
    }, 1000); // mejor cada 1000 ms, no cada 100 para evitar saturar GPS
  }


  startSoundGuidance() {
    this.soundInterval = setInterval(() => {
      if (this.selectedBeacon) {
        const distance = this.selectedBeacon.distance || 99;
        const angleDiff = Math.abs(this.normalizeAngle(this.directionAngle));
        const now = Date.now();
        const speakCooldown = 5000;

        if (angleDiff < 15) {
          if (now - this.lastNotificationTime > speakCooldown) {
            this.speak('Estás yendo en la dirección correcta.');
            this.lastNotificationTime = now;
          }
          this.vibrate(ImpactStyle.Heavy);
        } else if (angleDiff < 90) {
          if (now - this.lastNotificationTime > speakCooldown) {
            this.speak('No estás yendo en la dirección correcta, gira un poco.');
            this.lastNotificationTime = now;
          }
          this.vibrate(ImpactStyle.Medium);
        } else {
          if (now - this.lastNotificationTime > speakCooldown) {
            this.speak('Te estás alejando. Da la vuelta.');
            this.lastNotificationTime = now;
          }
          this.vibrate(ImpactStyle.Heavy);
        }
      }
    }, 1500);
  }

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

  getCustomName(mac: string): string | null {
    const macNames: { [key: string]: string } = {
      'D8:DE:11:70:B3:0A': 'Escaleras',
      'F7:31:A1:31:5E:5B': 'Cafetería',
      'D7:9B:16:04:4C:C0': 'Salón de Actos',
      'F5:16:21:95:E9:C2': 'Secretaría'
    };
    return macNames[mac] || null;
  }

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
    this.directionAngle = (angleToBeacon - heading + 360) % 360;

    const angle = this.directionAngle;
    const now = Date.now();
    const speakCooldown = 4000;
    const vibrationCooldown = 3000;

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
        this.speak('No estás yendo en la dirección correcta, gira un poco a la izquierda.');
        this.lastNotificationTime = now;
      }
      if (now - this.lastVibrationTime > vibrationCooldown) {
        this.vibrate(ImpactStyle.Medium);
        this.lastVibrationTime = now;
      }
    } else if (angle > 270 && angle < 345) {
      if (now - this.lastNotificationTime > speakCooldown) {
        this.speak('No estás yendo en la dirección correcta, gira un poco a la derecha.');
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
  }

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

  getBeaconCoordinates(mac: string): { latitude: number, longitude: number } | null {
    const coordinates: { [mac: string]: { latitude: number, longitude: number } } = {
      'D8:DE:11:70:B3:0A': { latitude: 40.4168, longitude: -3.7038 }, // Escaleras
      'F7:31:A1:31:5E:5B': { latitude: 40.4175, longitude: -3.7040 }, // Cafetería
      'D7:9B:16:04:4C:C0': { latitude: 40.4170, longitude: -3.7030 }, // Salón de Actos
      'F5:16:21:95:E9:C2': { latitude: 40.4180, longitude: -3.7020 }  // Secretaría
    };
    return coordinates[mac] || null;
  }

}
