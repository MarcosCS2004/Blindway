// Importación de componentes y módulos necesarios de Angular y Ionic
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
  IonCol,
  IonRow,
  IonGrid,
  IonRadio,
  IonLabel,
  IonItem,
  IonRadioGroup,
} from '@ionic/angular/standalone';

import { AjustesService } from '../service/ajustes.service'; // Servicio personalizado para gestión de ajustes

// Decorador que define el componente
@Component({
  selector: 'app-ajustes',
  templateUrl: './ajustes.page.html',
  styleUrls: ['./ajustes.page.scss'],
  standalone: true,
  imports: [
    IonRadioGroup, IonItem, IonLabel, IonRadio,
    IonGrid, IonRow, IonCol, IonButton, IonButtons,
    IonMenuButton, IonContent, IonHeader, IonTitle,
    IonToolbar, CommonModule, FormsModule
  ]
})
export class AjustesPage implements OnInit {
  // Propiedades para los valores seleccionados de tamaño y tema
  tamanioSeleccionado = 'medio';
  temaSeleccionado = 'claro';
  mostrarAcercaDe = false; // Controla si se muestra la sección "Acerca de"

  // Propiedades para mostrar mensajes tipo toast al usuario
  showToast = false;
  toastMessage = '';
  toastColor = 'success';

  constructor(private ajustesService: AjustesService) {}

  // Método del ciclo de vida que se ejecuta al iniciar el componente
  async ngOnInit() {
    console.log('AjustesPage ngOnInit iniciado');
    try {
      // Carga los ajustes almacenados
      const ajustes = await this.ajustesService.cargarAjustes();
      console.log('Ajustes cargados en componente:', ajustes);

      // Aplica los ajustes si existen o usa valores por defecto
      this.tamanioSeleccionado = ajustes.tamanio || 'medio';
      this.temaSeleccionado = ajustes.tema || 'claro';
      this.ajustesService.aplicarAjustes(ajustes);

      // Verifica si hay ajustes previamente guardados
      const tieneAjustes = await this.ajustesService.tieneAjustesGuardados();
      console.log('¿Tiene ajustes guardados?', tieneAjustes);
    } catch (error) {
      console.error('Error al cargar ajustes en ngOnInit:', error);
      this.mostrarMensaje('Error al cargar ajustes', 'danger');
    }
  }

  // Maneja el cambio de selección del tamaño
  async onTamanioChange(event: any) {
    console.log('Cambio de tamaño detectado:', event.detail.value);
    this.tamanioSeleccionado = event.detail.value;
    await this.guardar(); // Guarda los ajustes después del cambio
  }

  // Maneja el cambio de selección del tema
  async onTemaChange(event: any) {
    console.log('Cambio de tema detectado:', event.detail.value);
    this.temaSeleccionado = event.detail.value;
    await this.guardar(); // Guarda los ajustes después del cambio
  }

  // Método para guardar y aplicar los ajustes
  async guardar() {
    console.log('Guardando ajustes...');
    try {
      const ajustes = {
        tamanio: this.tamanioSeleccionado,
        tema: this.temaSeleccionado
      };
      console.log('Ajustes a guardar:', ajustes);

      await this.ajustesService.guardarAjustes(ajustes); // Guarda ajustes en almacenamiento
      this.ajustesService.aplicarAjustes(ajustes);       // Aplica los ajustes de forma inmediata

      this.mostrarMensaje('Ajustes guardados correctamente', 'success');

      // Verifica que se hayan guardado correctamente
      const ajustesGuardados = await this.ajustesService.cargarAjustes();
      console.log('Verificación - ajustes después de guardar:', ajustesGuardados);
    } catch (error) {
      console.error('Error al guardar ajustes:', error);
      this.mostrarMensaje('Error al guardar ajustes', 'danger');
    }
  }

  // Muestra un mensaje al usuario mediante un toast
  private mostrarMensaje(mensaje: string, color: string) {
    this.toastMessage = mensaje;
    this.toastColor = color;
    this.showToast = true;
  }

  // Cambia a la vista "Acerca de"
  onAcercaDe() {
    this.mostrarAcercaDe = true;
  }

  // Vuelve a la vista principal de ajustes
  volverAtras() {
    this.mostrarAcercaDe = false;
  }

  // Método de prueba manual para verificar el almacenamiento
  async verificarStorage() {
    try {
      const ajustes = await this.ajustesService.cargarAjustes();
      console.log('Verificación manual - ajustes actuales:', ajustes);

      const tieneAjustes = await this.ajustesService.tieneAjustesGuardados();
      console.log('Verificación manual - tiene ajustes:', tieneAjustes);

      this.mostrarMensaje(`Ajustes: ${JSON.stringify(ajustes)}`, 'primary');
    } catch (error) {
      console.error('Error en verificación:', error);
      this.mostrarMensaje('Error en verificación', 'danger');
    }
  }
}
