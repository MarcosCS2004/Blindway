import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

@Injectable({
  providedIn: 'root' // Servicio disponible en toda la aplicación (singleton)
})
export class AjustesService {
  private _storage: Storage | null = null; // Instancia privada de Storage
  private storageReady: Promise<void>; // Promesa para saber cuándo el storage está listo

  // Ajustes por defecto en caso de no encontrar configuraciones guardadas
  private defaultAjustes = {
    tamanio: 'medio',
    tema: 'claro'
  };

  constructor(private storage: Storage) {
    console.log('AjustesService constructor iniciado');
    // Inicializar el almacenamiento y guardar la promesa para sincronización
    this.storageReady = this.init();
  }

  // Método privado para crear e inicializar el almacenamiento
  private async init(): Promise<void> {
    console.log('Iniciando storage...');
    try {
      const storage = await this.storage.create(); // Crear instancia de Storage
      this._storage = storage;
      console.log('Storage inicializado correctamente:', this._storage);
    } catch (error) {
      console.error('Error al inicializar storage:', error);
      throw error; // Propaga el error para que se pueda manejar externamente
    }
  }

  // Asegura que el almacenamiento esté listo antes de usarlo
  private async ensureStorageReady(): Promise<void> {
    if (!this._storage) {
      console.log('Storage no está listo, esperando...');
      await this.storageReady;
    }
  }

  // Guarda los ajustes en el almacenamiento persistente
  async guardarAjustes(ajustes: any): Promise<void> {
    console.log('Guardando ajustes:', ajustes);
    try {
      await this.ensureStorageReady(); // Esperar a que el storage esté listo
      await this._storage?.set('ajustes', ajustes); // Guardar ajustes con clave 'ajustes'
      console.log('Ajustes guardados exitosamente');
    } catch (error) {
      console.error('Error al guardar ajustes:', error);
      throw error; // Propagar el error para manejo en componentes que llamen este método
    }
  }

  // Carga los ajustes guardados o devuelve los valores por defecto si no hay guardados
  async cargarAjustes(): Promise<any> {
    console.log('Cargando ajustes...');
    try {
      await this.ensureStorageReady(); // Asegurar almacenamiento listo
      const ajustes = await this._storage?.get('ajustes'); // Obtener ajustes guardados
      const resultado = ajustes ?? this.defaultAjustes; // Usar por defecto si no hay ajustes
      console.log('Ajustes cargados:', resultado);
      console.log('¿Eran ajustes por defecto?', ajustes === null || ajustes === undefined);
      return resultado;
    } catch (error) {
      console.error('Error al cargar ajustes:', error);
      console.log('Devolviendo ajustes por defecto debido al error');
      return this.defaultAjustes; // En caso de error, devolver ajustes por defecto
    }
  }

  // Aplica los ajustes recibidos (tamaño y tema)
  aplicarAjustes(ajustes: any) {
    console.log('Aplicando ajustes:', ajustes);
    if (!ajustes) {
      console.warn('No se recibieron ajustes para aplicar');
      return; // Salir si no hay ajustes
    }
    this.aplicarTamanio(ajustes.tamanio);
    this.aplicarTema(ajustes.tema);
    console.log('Ajustes aplicados completamente');
  }

  // Aplica la clase CSS correspondiente al tamaño de fuente seleccionado
  private aplicarTamanio(tamanio: string) {
    console.log('Aplicando tamaño:', tamanio);
    const body = document.body;

    console.log('Clases de body antes:', body.className);

    // Elimina clases de tamaño previamente aplicadas
    body.classList.remove('font-small', 'font-medium', 'font-large');

    // Añade la clase según el tamaño recibido
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

    console.log('Clases de body después:', body.className);
  }

  // Aplica la clase CSS correspondiente al tema seleccionado (claro u oscuro)
  private aplicarTema(tema: string) {
    console.log('Aplicando tema:', tema);
    const body = document.body;

    console.log('Clases de body antes:', body.className);

    // Elimina clases de tema previamente aplicadas
    body.classList.remove('theme-light', 'theme-dark');

    // Añade la clase según el tema recibido
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

    console.log('Clases de body después:', body.className);
  }

  // Método para verificar si existen ajustes guardados
  async tieneAjustesGuardados(): Promise<boolean> {
    try {
      await this.ensureStorageReady();
      const ajustes = await this._storage?.get('ajustes');
      return ajustes !== null && ajustes !== undefined;
    } catch (error) {
      console.error('Error al verificar ajustes:', error);
      return false; // En caso de error, se asume que no hay ajustes guardados
    }
  }
}
