import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { Geolocation } from '@capacitor/geolocation';

@Component({
  selector: 'app-guia-visual',
  templateUrl: './guia-visual.page.html',
  styleUrls: ['./guia-visual.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class GuiaVisualPage implements OnInit, OnDestroy {
  // Lista de balizas detectadas
  beacons: any[] = [];

  // Estado del escaneo BLE
  isScanning = false;

  // Intensidad de señal, orientación relativa y orientación a traves de la geolocalización
  signalStrength = 0;
  directionAngle = 0;
  currentHeading = 0;
  currentPosition: { latitude: number; longitude: number } | null = null;

  // Baliza actualmente seleccionada
  selectedBeacon: any = null;

  // Confiabilidad del RSSI (baja varianza = señal estable)
  signalReliability: 'Alta' | 'Media' | 'Baja' = 'Alta';

  // Variables auxiliares
  private orientationListener: any;
  private scanTimeout: any;
  private directionInterval: any;
  private rssiHistory: { [mac: string]: number[] } = {};
  private geoWatchId: string | null = null;
  lastNotificationTime = 0;

  // Lista de MACs permitidas (filtro de balizas)
  allowedMacs: string[] = [
    'D8:DE:11:70:B3:0A',
    'F7:31:A1:31:5E:5B',
    'D7:9B:16:04:4C:C0',
    'F5:16:21:95:E9:C2',
    'E3:B3:F9:53:28:5F'
  ];

  constructor(private alertController: AlertController) {}

  ngOnInit() {
    // Inicializa BLE, brújula y actualizaciones de dirección al iniciar la vista
    this.initializeBle();
    this.startCompass();
    this.startDirectionUpdater();
    this.startWatchingPosition();
  }

  ngOnDestroy() {
    // Detiene procesos al salir de la vista
    this.stopScan();
    this.stopDirectionUpdater();
    if (this.geoWatchId) {
      Geolocation.clearWatch({ id: this.geoWatchId });
      this.geoWatchId = null;
    }
    window.removeEventListener('deviceorientationabsolute', this.orientationListener);
  }

  async initializeBle() {
    try {
      // Inicialización de cliente BLE
      await BleClient.initialize();
      console.log('BLE initialized');
    } catch (error) {
      console.error('BLE initialization error', error);
    }
  }

  async startScan() {
    this.isScanning = true;
    this.beacons = [];
    this.rssiHistory = {};

    try {
      // Solicita permisos de geolocalización si están disponibles
      if ('permissions' in navigator) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          if (permissionStatus.state !== 'granted') {
            console.warn('Permiso de ubicación no concedido. BLE puede no funcionar correctamente.');
          }
        } catch (permErr) {
          console.warn('Error al verificar permisos de geolocalización:', permErr);
        }
      }

      // Inicia escaneo BLE
      await BleClient.requestLEScan(
        {},
        (result) => {
          // Procesa solo si hay una MAC válida
          if (!result?.device?.deviceId) return;
          const mac = result.device.deviceId.toUpperCase();
          this.processBeacon({ ...result, device: { deviceId: mac } });
        }
      );

      // Finaliza escaneo automáticamente tras 15 segundos
      this.scanTimeout = setTimeout(() => {
        this.stopScan();
        if (this.beacons.length === 0) {
          this.showNoBeaconsAlert();
        } else if (!this.selectedBeacon) {
          this.selectedBeacon = this.beacons[0]; // Selecciona la más cercana
        }
      }, 15000);

    } catch (error) {
      console.error('Scan error', error);
      this.isScanning = false;
    }
  }

  stopScan() {
    // Detiene el escaneo BLE y elimina timeout
    BleClient.stopLEScan();
    this.isScanning = false;
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }
  }

  async showNoBeaconsAlert() {
    // Alerta si no se detectan balizas
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

  startCompass() {
    // Escucha eventos de orientación absoluta del dispositivo
    this.orientationListener = (event: DeviceOrientationEvent) => {
      const heading = event.alpha ?? 0;
      this.currentHeading = heading;
      this.updateDirection(); // Actualiza dirección al rotar
    };

    window.addEventListener('deviceorientationabsolute', this.orientationListener, true);
  }

  startDirectionUpdater() {
    // Refresca dirección y fiabilidad de señal cada 100 ms
    this.directionInterval = setInterval(() => {
      if (this.selectedBeacon && this.currentPosition) {
        const updated = this.beacons.find(b => b.address === this.selectedBeacon.address);
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

  stopDirectionUpdater() {
    if (this.directionInterval) {
      clearInterval(this.directionInterval);
      this.directionInterval = null;
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
      'F5:16:21:95:E9:C2': 'Secretaría',
      'E3:B3:F9:53:28:5F': 'Intersección Cafetería y Entrada'
    };
    return macNames[mac] || null;
  }

  updateDirection() {
    if (!this.selectedBeacon || !this.currentPosition) return;

    // Calcula variación de ángulo basada en la señal
    const targetAngle =
      (this.getBearing(
        this.currentPosition.latitude,
        this.currentPosition.longitude,
        this.selectedBeacon.latitude,
        this.selectedBeacon.longitude
      ) - this.currentHeading + 360) % 360;

    // Suaviza el cambio de dirección para evitar saltos bruscos
    let delta = targetAngle - this.directionAngle;
    delta = ((delta + 540) % 360) - 180;
    this.directionAngle += delta * 0.25;

    this.checkAlignmentAndNotify();
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

  getBeaconCoordinates(mac: string): { latitude: number, longitude: number } | null {
    // Coordenadas de las balizas
    const coordinates: { [mac: string]: { latitude: number, longitude: number } } = {
      'D8:DE:11:70:B3:0A': { latitude: 40.4734286, longitude: -3.6974712 }, // Escaleras
      'F7:31:A1:31:5E:5B': { latitude: 40.4734276, longitude: -3.6974739 }, // Cafetería
      'D7:9B:16:04:4C:C0': { latitude: 40.4735414, longitude: -3.6969087 }, // Salón de Actos
      'F5:16:21:95:E9:C2': { latitude: 40.4734276, longitude: -3.6974739 }, // Secretaría
      'E3:B3:F9:53:28:5F': { latitude: 40.4734276, longitude: -3.6974739 }  // Intersección

    };
    return coordinates[mac] || null;
  }

  // Operación matematica para pasar de Radianes a Grados para utilizarlo en la brujula
  getBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRadians = (deg: number) => deg * Math.PI / 180;
    const toDegrees = (rad: number) => rad * 180 / Math.PI;

    const dLon = toRadians(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRadians(lat2));
    const x = Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
              Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(dLon);

    const brng = Math.atan2(y, x);
    return (toDegrees(brng) + 360) % 360;
  }

  // Fija desde donde estás haciendo el escaneo
  async startWatchingPosition() {
    try {
      this.geoWatchId = await Geolocation.watchPosition({}, (position) => {
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
}
