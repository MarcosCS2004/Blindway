import { Component, OnInit, OnDestroy } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Haptics } from '@capacitor/haptics';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

interface Beacon {
  mac: string;
  name: string;
  rssi: number;
  smoothedRssi: number;
  distance: number;
  lastSeen: number;
  signalQuality: 'excelente' | 'buena' | 'debil';
}

@Component({
  selector: 'app-guia-sonora',
  standalone: true,              
  imports: [
    CommonModule,                
    IonicModule                  
  ],
  templateUrl: './guia-sonora.page.html',
  styleUrls: ['./guia-sonora.page.scss']
})
export class GuiaSonoraPage implements OnInit, OnDestroy {
  // Configuración
  private readonly SCAN_DURATION = 20000;  // 20s
  private readonly RSSI_WINDOW_SIZE = 10;
  private readonly BASE_TX_POWER = -59;
  private readonly DEVIATION_THRESHOLD = 0.5; // m

  // Estados
  beacons: Beacon[] = [];
  scanning = false;
  navigationMode: 'direccion' | 'proximidad' = 'direccion';
  selectedBeacon?: Beacon;
  private lastDistance?: number;

  // TTS
  ttsConfig = { enabled: true, rate: 1.0, lang: 'es-ES' };
  private rssiCache = new Map<string, number[]>();

  constructor(private alertCtrl: AlertController) {}

  async ngOnInit() {
    await BleClient.initialize();
    const langs = await TextToSpeech.getSupportedLanguages();
    this.ttsConfig.enabled = langs.languages.includes(this.ttsConfig.lang);
    await ScreenOrientation.unlock();
  }

  ngOnDestroy() {
    ScreenOrientation.unlock();
    TextToSpeech.stop();
  }

  private async initServices() {
    try {
      await BleClient.initialize();
      await this.checkTtsSupport();
    } catch (err) {
      this.showError('Inicialización fallida', err);
    }
  }

  private async checkTtsSupport() {
    try {
      const langs = await TextToSpeech.getSupportedLanguages();
      this.ttsConfig.enabled = langs.languages.includes(this.ttsConfig.lang);
    } catch {
      this.ttsConfig.enabled = false;
    }
  }

  async toggleScan() {
    if (this.scanning) await this.stopScan(); else await this.startScan();
  }

  private async startScan() {
    this.scanning = true;
    this.beacons = [];
    this.rssiCache.clear();
    this.lastDistance = undefined;
    try {
      await BleClient.requestLEScan({}, result => this.handleScanResult(result));
      setTimeout(() => this.stopScan(), this.SCAN_DURATION);
    } catch (err) {
      this.showError('Error escaneo BLE', err);
      this.scanning = false;
    }
  }

  private async stopScan() {
    await BleClient.stopLEScan();
    this.scanning = false;
    if (this.beacons.length) this.selectBestBeacon(); else this.notifyNotFound();
  }

  private async handleScanResult(result: any) {
    const mac = result.device.deviceId;
    const vals = this.rssiCache.get(mac) || [];
    vals.push(result.rssi);
    if (vals.length > this.RSSI_WINDOW_SIZE) vals.shift();
    this.rssiCache.set(mac, vals);

    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const distance = +Math.pow(10, (this.BASE_TX_POWER - avg) / (10 * 2.5)).toFixed(2);
    const beacon: Beacon = { mac, name: result.localName || 'Desconocida', rssi: result.rssi, smoothedRssi: avg, distance, lastSeen: Date.now(), signalQuality: avg >= -60 ? 'excelente' : avg >= -70 ? 'buena' : 'debil' };

    const idx = this.beacons.findIndex(b => b.mac === beacon.mac);
    if (idx > -1) this.beacons[idx] = beacon; else this.beacons.push(beacon);
    this.beacons.sort((a, b) => b.smoothedRssi - a.smoothedRssi);

    if (this.selectedBeacon?.mac === beacon.mac) await this.checkDeviation(beacon.distance);
  }

  private selectBestBeacon() {
    this.selectedBeacon = this.beacons[0];
    this.lastDistance = this.selectedBeacon.distance;
    this.vibrate();
    this.speak(`Navegando hacia ${this.selectedBeacon.name}, a ${this.selectedBeacon.distance} metros.`);
  }

  private async checkDeviation(currentDistance: number) {
    if (this.lastDistance !== undefined && currentDistance - this.lastDistance > this.DEVIATION_THRESHOLD) {
      const message = `¡Cuidado! Te estás alejando de ${this.selectedBeacon!.name}. Regresa aproximadamente ${(currentDistance - this.lastDistance).toFixed(2)} metros.`;
      this.vibrate();
      await this.showCustomAlert('Desviación detectada', message);
      this.speak(message);
    }
    this.lastDistance = currentDistance;
  }

  private vibrate() {
    Haptics.vibrate();
  }

  private async speak(text: string) {
    if (!this.ttsConfig.enabled) return;
    await TextToSpeech.speak({ text, rate: this.ttsConfig.rate, lang: this.ttsConfig.lang });
  }

  async toggleMode() {
    if (this.navigationMode === 'direccion') {
      this.navigationMode = 'proximidad';
      await ScreenOrientation.lock({ orientation: 'portrait' });
    } else {
      this.navigationMode = 'direccion';
      await ScreenOrientation.lock({ orientation: 'landscape' });
    }
    this.vibrate();
  }

  private async showCustomAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({ header, message, buttons: ['OK'] });
    await alert.present();
  }

  private notifyNotFound() {
    this.showCustomAlert('No hay balizas', 'No se detectaron dispositivos BLE cercanos.');
    this.speak('No se encontraron balizas cercanas.');
  }

  private showError(title: string, err: any) {
    this.alertCtrl.create({ header: title, message: err.message || err, buttons: ['OK'] }).then(a => a.present());
  }
}
