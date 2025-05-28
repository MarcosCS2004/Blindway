import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

@Injectable({
  providedIn: 'root'
})
export class AjustesService {
  private _storage: Storage | null = null;
  private storageReady: Promise<void>;
  private defaultAjustes = {
    tamanio: 'medio',
    tema: 'claro'
  };

  constructor(private storage: Storage) {
    console.log('AjustesService constructor iniciado');
    this.storageReady = this.init();
  }

  private async init(): Promise<void> {
    console.log('Iniciando storage...');
    try {
      const storage = await this.storage.create();
      this._storage = storage;
      console.log('Storage inicializado correctamente:', this._storage);
    } catch (error) {
      console.error('Error al inicializar storage:', error);
      throw error;
    }
  }

  private async ensureStorageReady(): Promise<void> {
    if (!this._storage) {
      console.log('Storage no está listo, esperando...');
      await this.storageReady;
    }
  }

  async guardarAjustes(ajustes: any): Promise<void> {
    console.log('Guardando ajustes:', ajustes);
    try {
      await this.ensureStorageReady(); // ✅ Asegurar que storage esté listo
      await this._storage?.set('ajustes', ajustes);
      console.log('Ajustes guardados exitosamente');
    } catch (error) {
      console.error('Error al guardar ajustes:', error);
      throw error; // ✅ Propagar el error para manejo en el componente
    }
  }

  async cargarAjustes(): Promise<any> {
    console.log('Cargando ajustes...');
    try {
      await this.ensureStorageReady(); // ✅ Asegurar que storage esté listo
      const ajustes = await this._storage?.get('ajustes');
      const resultado = ajustes ?? this.defaultAjustes;
      console.log('Ajustes cargados:', resultado);
      console.log('¿Eran ajustes por defecto?', ajustes === null || ajustes === undefined);
      return resultado;
    } catch (error) {
      console.error('Error al cargar ajustes:', error);
      console.log('Devolviendo ajustes por defecto debido al error');
      return this.defaultAjustes;
    }
  }

  aplicarAjustes(ajustes: any) {
    console.log('Aplicando ajustes:', ajustes);
    if (!ajustes) {
      console.warn('No se recibieron ajustes para aplicar');
      return;
    }
    this.aplicarTamanio(ajustes.tamanio);
    this.aplicarTema(ajustes.tema);
    console.log('Ajustes aplicados completamente');
  }

  private aplicarTamanio(tamanio: string) {
    console.log('Aplicando tamaño:', tamanio);
    const body = document.body;
    
    // Log de clases antes de remover
    console.log('Clases de body antes:', body.className);
    
    body.classList.remove('font-small', 'font-medium', 'font-large');
    
    switch (tamanio) {
      case 'pequeño':
        body.classList.add('font-small');
        console.log('Aplicada clase: font-small');
        break;
      case 'medio':
        body.classList.add('font-medium');
        console.log('Aplicada clase: font-medium');
        break;
      case 'grande':
        body.classList.add('font-large');
        console.log('Aplicada clase: font-large');
        break;
      default:
        console.warn('Tamaño no reconocido:', tamanio);
    }
    
    // Log de clases después de aplicar
    console.log('Clases de body después:', body.className);
  }

  private aplicarTema(tema: string) {
    console.log('Aplicando tema:', tema);
    const body = document.body;
    
    // Log de clases antes de remover
    console.log('Clases de body antes:', body.className);
    
    body.classList.remove('theme-light', 'theme-dark');
    
    switch (tema) {  
      case 'claro':
        body.classList.add('theme-light');
        console.log('Aplicada clase: theme-light');
        break;
      case 'oscuro':
        body.classList.add('theme-dark');
        console.log('Aplicada clase: theme-dark');
        break;
      default:
        console.warn('Tema no reconocido:', tema);
    }
    
    // Log de clases después de aplicar
    console.log('Clases de body después:', body.className);
  }

  // ✅ Método para verificar si hay ajustes guardados
  async tieneAjustesGuardados(): Promise<boolean> {
    try {
      await this.ensureStorageReady();
      const ajustes = await this._storage?.get('ajustes');
      return ajustes !== null && ajustes !== undefined;
    } catch (error) {
      console.error('Error al verificar ajustes:', error);
      return false;
    }
  }
}