import { Component, OnInit } from '@angular/core';

// Importación de módulos comunes y de formularios de Angular
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Importación de componentes de Ionic que se usan en la plantilla HTML
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonButton,
  IonLabel,
  IonItem
} from '@ionic/angular/standalone';

// Importación del plugin CallNumber para realizar llamadas telefónicas
import { CallNumber } from '@awesome-cordova-plugins/call-number/ngx';

@Component({
  selector: 'app-llamada-emergencias', 
  templateUrl: './llamada-emergencias.page.html', 
  styleUrls: ['./llamada-emergencias.page.scss'], 
  standalone: true, // Indica que este componente no depende de un módulo
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
  providers: [CallNumber] // Registro del proveedor CallNumber para inyección de dependencias
})
export class LlamadaEmergenciasPage implements OnInit {

  // Inyección del servicio CallNumber en el constructor
  constructor(private callNumber: CallNumber) {}
  
  // Método del ciclo de vida, se ejecuta al inicializar el componente
  ngOnInit() {}

  // Método que realiza la llamada al número indicado
  hacerLlamada() {
    this.callNumber.callNumber('+34 913 14 67 06', true)
      .then(res => console.log('Llamada realizada con éxito', res)) // Éxito al hacer la llamada
      .catch(err => console.error('Error al realizar la llamada', err)); // Error al intentar llamar
  }
}
