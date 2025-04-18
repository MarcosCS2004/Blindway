import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { BleClient } from '@capacitor-community/bluetooth-le';

@Component({
  selector: 'app-guia-visual',
  templateUrl: './guia-visual.page.html',
  styleUrls: ['./guia-visual.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class GuiaVisualPage implements OnInit, OnDestroy {
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
    'F7:31:A1:31:5E:5B'
  ];

  constructor(private alertController: AlertController) {}

  ngOnInit() {
    this.initializeBle();
    this.startCompass();
    this.startDirectionUpdater();
  }

  ngOnDestroy() {
    this.stopScan();
    this.stopDirectionUpdater();
    window.removeEventListener('deviceorientationabsolute', this.orientationListener);
  }

  async initializeBle() {
    try {
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

      await BleClient.requestLEScan(
        {},
        (result) => {
          if (!result?.device?.deviceId) return;
          const mac = result.device.deviceId.toUpperCase();
          this.processBeacon({ ...result, device: { deviceId: mac } });
        }
      );

      this.scanTimeout = setTimeout(() => {
        this.stopScan();
        if (this.beacons.length === 0) {
          this.showNoBeaconsAlert();
        } else if (!this.selectedBeacon) {
          this.selectedBeacon = this.beacons[0];
        }
      }, 15000);

    } catch (error) {
      console.error('Scan error', error);
      this.isScanning = false;
    }
  }

  stopScan() {
    BleClient.stopLEScan();
    this.isScanning = false;
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }
  }

  async showNoBeaconsAlert() {
    const alert = await this.alertController.create({
      header: 'Sin balizas detectadas',
      message: 'No se han encontrado balizas BLE después de 15 segundos.',
      buttons: ['OK']
    });
    await alert.present();
  }

  async showCalibrationTip() {
    const alert = await this.alertController.create({
      header: 'Calibración de brújula',
      message: 'Mueve el teléfono en forma de ∞ para mejorar la precisión de orientación.',
      buttons: ['Entendido']
    });
    await alert.present();
  }

  async checkAlignmentAndNotify() {
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
    this.orientationListener = (event: DeviceOrientationEvent) => {
      const heading = event.alpha ?? 0;
      this.currentHeading = heading;
      this.updateDirection(); // Se actualiza también al mover el móvil
    };

    window.addEventListener('deviceorientationabsolute', this.orientationListener, true);
  }

  startDirectionUpdater() {
    this.directionInterval = setInterval(() => {
      if (this.selectedBeacon) {
        const updated = this.beacons.find(b => b.address === this.selectedBeacon.address);
        if (updated) {
          this.signalStrength = this.mapRssiToStrength(updated.rssi);
          this.selectedBeacon.rssi = updated.rssi;
          this.selectedBeacon.distance = this.calculateDistance(updated.rssi);
          this.signalReliability = this.getSignalReliability(this.selectedBeacon.address);
          this.updateDirection(); // También si cambia el RSSI
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
    const mac = result.device.deviceId;
    if (!mac || !this.allowedMacs.includes(mac)) return;

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

    this.beacons.sort((a, b) => a.distance - b.distance);
  }

  updateDirection() {
    if (!this.selectedBeacon) return;

    const angleVariation = (100 - this.signalStrength) * 3.6;
    const correctedAngle = (this.currentHeading + angleVariation) % 360;
    const targetAngle = correctedAngle;

    let delta = targetAngle - this.directionAngle;
    delta = ((delta + 540) % 360) - 180;

    this.directionAngle += delta * 0.25;
    this.checkAlignmentAndNotify();
  }

  calculateDistance(rssi: number): number {
    const txPower = -59;
    if (rssi === 0) return -1;
    const ratio = rssi / txPower;
    return ratio < 1.0
      ? Math.pow(ratio, 10)
      : 0.89976 * Math.pow(ratio, 7.7095) + 0.111;
  }

  mapRssiToStrength(rssi: number): number {
    if (rssi >= -50) return 100;
    if (rssi <= -100) return 0;
    return Math.round((rssi + 100) * 2);
  }

  getSignalReliability(mac: string): 'Alta' | 'Media' | 'Baja' {
    const rssiValues = this.rssiHistory[mac];
    if (!rssiValues || rssiValues.length < 3) return 'Baja';

    const avg = rssiValues.reduce((a, b) => a + b) / rssiValues.length;
    const variance = rssiValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / rssiValues.length;

    if (variance < 4) return 'Alta';
    if (variance < 10) return 'Media';
    return 'Baja';
  }
}
