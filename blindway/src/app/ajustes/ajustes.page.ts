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
  IonIcon,
  IonToast // ✅ Para mostrar feedback al usuario
} from '@ionic/angular/standalone';
import { AjustesService } from '../service/ajustes.service';

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
  tamanioSeleccionado = 'medio';
  temaSeleccionado = 'claro';
  mostrarAcercaDe = false;
  
  // ✅ Para mostrar feedback al usuario
  showToast = false;
  toastMessage = '';
  toastColor = 'success';

  constructor(private ajustesService: AjustesService) {}

  async ngOnInit() {
    console.log('AjustesPage ngOnInit iniciado');
    try {
      // ✅ Cargar ajustes con manejo de errores
      const ajustes = await this.ajustesService.cargarAjustes();
      console.log('Ajustes cargados en componente:', ajustes);
      
      this.tamanioSeleccionado = ajustes.tamanio || 'medio';
      this.temaSeleccionado = ajustes.tema || 'claro';
      
      // ✅ Aplicar ajustes cargados
      this.ajustesService.aplicarAjustes(ajustes);
      
      // ✅ Verificar si hay ajustes guardados para debug
      const tieneAjustes = await this.ajustesService.tieneAjustesGuardados();
      console.log('¿Tiene ajustes guardados?', tieneAjustes);
      
    } catch (error) {
      console.error('Error al cargar ajustes en ngOnInit:', error);
      this.mostrarMensaje('Error al cargar ajustes', 'danger');
    }
  }

  async onTamanioChange(event: any) {
    console.log('Cambio de tamaño detectado:', event.detail.value);
    this.tamanioSeleccionado = event.detail.value;
    await this.guardar();
  }

  async onTemaChange(event: any) {
    console.log('Cambio de tema detectado:', event.detail.value);
    this.temaSeleccionado = event.detail.value;
    await this.guardar();
  }

  async guardar() {
    console.log('Guardando ajustes...');
    try {
      const ajustes = {
        tamanio: this.tamanioSeleccionado,
        tema: this.temaSeleccionado
      };
      
      console.log('Ajustes a guardar:', ajustes);
      
      // ✅ Guardar ajustes
      await this.ajustesService.guardarAjustes(ajustes);
      
      // ✅ Aplicar ajustes inmediatamente
      this.ajustesService.aplicarAjustes(ajustes);
      
      // ✅ Mostrar feedback al usuario
      this.mostrarMensaje('Ajustes guardados correctamente', 'success');
      
      // ✅ Verificar que realmente se guardaron
      const ajustesGuardados = await this.ajustesService.cargarAjustes();
      console.log('Verificación - ajustes después de guardar:', ajustesGuardados);
      
    } catch (error) {
      console.error('Error al guardar ajustes:', error);
      this.mostrarMensaje('Error al guardar ajustes', 'danger');
    }
  }

  // ✅ Método para mostrar mensajes al usuario
  private mostrarMensaje(mensaje: string, color: string) {
    this.toastMessage = mensaje;
    this.toastColor = color;
    this.showToast = true;
  }

  onAcercaDe() {
    this.mostrarAcercaDe = true;
  }

  volverAtras() {
    this.mostrarAcercaDe = false;
  }

  // ✅ Método para testing manual
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