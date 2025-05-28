import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

@Component({
  selector: 'app-guia-sonora',
  templateUrl: './guia-sonora.page.html',
  styleUrls: ['./guia-sonora.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class GuiaSonoraPage implements OnInit, OnDestroy {
  beacons: any[] = [];
  isScanning = false;
  signalStrength = 0;
  directionAngle = 0;
  currentHeading = 0;
  selectedBeacon: any = null;
  signalReliability: 'Alta' | 'Media' | 'Baja' = 'Alta';
  private orientationListener: any;
  private scanTimeout: any;
  private directionInterval: any;
  private rssiHistory: { [mac: string]: number[] } = {};
  lastNotificationTime = 0;
  allowedMacs: string[] = [
    'D8:DE:11:70:B3:0A',
    'F7:31:A1:31:5E:5B',
    'D7:9B:16:04:4C:C0',
    'F5:16:21:95:E9:C2'
  ];

  constructor(private alertController: AlertController) {}

  ngOnInit() {
    this.initializeBle();
    this.startCompass();
    this.startDirectionUpdater();
    this.speak('Guía visual iniciada. Iniciando escaneo de balizas.');
  }

  ngOnDestroy() {
    this.stopScan();
    this.stopDirectionUpdater();
    window.removeEventListener('deviceorientationabsolute', this.orientationListener);
    this.speak('Guía visual detenida.');
  }

  async initializeBle() {
    try {
      await BleClient.initialize();
      console.log('BLE initialized');
      this.speak('Bluetooth inicializado.');
    } catch (error) {
      console.error('BLE initialization error', error);
      this.speak('Error al inicializar Bluetooth.');
    }
  }

  async speak(text: string) {
    await TextToSpeech.speak({
      text: text,
      lang: 'es-ES',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
    });
  }

  async vibrate(style: ImpactStyle = ImpactStyle.Medium) {
    try {
      await Haptics.impact({ style });
    } catch (error) {
      console.warn('Haptics not supported or failed:', error);
    }
  }

  selectBeacon(beacon: any) {
    this.selectedBeacon = beacon;
    this.speak(`Baliza seleccionada: ${beacon.mac}`);
    this.vibrate(ImpactStyle.Light);
  }

  updateSignalStrength(rssi: number) {
    this.signalStrength = rssi;
    if (rssi > -60) {
      this.speak('Estás muy cerca de la baliza.');
      this.vibrate(ImpactStyle.Heavy);
    } else if (rssi < -90) {
      this.speak('Señal muy débil.');
      this.vibrate(ImpactStyle.Light);
    }
  }

  notifyNoBeaconsFound() {
    this.speak('No hay balizas cercanas disponibles.');
    this.vibrate(ImpactStyle.Light);
  }

  async startScan() {
    this.isScanning = true;
    this.speak('Escaneo iniciado. Buscando balizas cercanas.');
    this.vibrate();
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
    this.speak('Escaneo detenido.');
    this.vibrate();
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
      if (this.selectedBeacon) {
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
    const updatedBeacon = {
      name: result.localName || 'Unknown Beacon',
      address: mac,
      rssi: avgRssi,
      distance: this.calculateDistance(avgRssi),
      lastSeen: new Date()
    };

    if (beaconIndex === -1) {
      this.beacons.push(updatedBeacon);
    } else {
      this.beacons[beaconIndex] = updatedBeacon;
    }

    // Ordena las balizas por distancia
    this.beacons.sort((a, b) => a.distance - b.distance);
  }

  updateDirection() {
    if (!this.selectedBeacon) return;

    // Calcula variación de ángulo basada en la señal
    const angleVariation = (100 - this.signalStrength) * 3.6;
    const correctedAngle = (this.currentHeading + angleVariation) % 360;
    const angleDiff = Math.abs(this.directionAngle - this.currentHeading);

    if (angleDiff < 15) {
      this.speak('Estás yendo en la dirección correcta.');
      this.vibrate(ImpactStyle.Heavy);
    } else if (angleDiff < 90) {
      this.speak('Gira ligeramente hacia la baliza.');
      this.vibrate(ImpactStyle.Medium);
    } else {
      this.speak('Te estás alejando. Da la vuelta.');
      this.vibrate(ImpactStyle.Heavy);
    }

    // Suaviza el cambio de dirección para evitar saltos bruscos
    let delta = correctedAngle - this.directionAngle;
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
}
