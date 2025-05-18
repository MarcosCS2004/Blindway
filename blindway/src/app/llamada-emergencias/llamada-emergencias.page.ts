import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonButton,
} from '@ionic/angular/standalone';

import { CallNumber } from '@awesome-cordova-plugins/call-number/ngx';

@Component({
  selector: 'app-llamada-emergencias',
  templateUrl: './llamada-emergencias.page.html',
  styleUrls: ['./llamada-emergencias.page.scss'],
  standalone: true,
  imports: [
    IonButton,
    IonButtons,
    IonMenuButton,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule
  ],
  providers: [CallNumber] // 👈 Aquí se registra el servicio
})
export class LlamadaEmergenciasPage implements OnInit {

  constructor(private callNumber: CallNumber) {}

  ngOnInit() {}

  hacerLlamada() {
    this.callNumber.callNumber('+34 913 14 67 06', true)
      .then(res => console.log('Llamada realizada con éxito', res))
      .catch(err => console.error('Error al realizar la llamada', err));
  }
}
