import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { 
  IonApp, 
  IonSplitPane, 
  IonMenu, 
  IonContent, 
  IonList, 
  IonListHeader, 
  IonNote, 
  IonMenuToggle, 
  IonItem, 
  IonIcon, 
  IonLabel, 
  IonRouterOutlet, 
  IonRouterLink 
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import { 
  homeSharp,          
  volumeHigh,          
  eyeOutline,          
  settings,
  call // Icono para la opción de llamada de emergencia
} from 'ionicons/icons';

import { AjustesService } from './service/ajustes.service';

@Component({
  selector: 'app-root',  // Selector principal de la app
  templateUrl: 'app.component.html',  // Archivo de plantilla HTML
  styleUrls: ['app.component.scss'],  // Archivo de estilos SCSS
  imports: [                      // Importación de componentes y directivas necesarias
    RouterLink, 
    RouterLinkActive, 
    IonApp, 
    IonSplitPane, 
    IonMenu, 
    IonContent, 
    IonList, 
    IonListHeader, 
    IonNote, 
    IonMenuToggle, 
    IonItem, 
    IonIcon, 
    IonLabel, 
    IonRouterLink, 
    IonRouterOutlet,
  ],
})
export class AppComponent implements OnInit {

  // Definición de las páginas que aparecen en el menú lateral con título, ruta y icono
  public appPages = [
    { title: 'Principal', url: '/principal', icon: 'home-sharp' },    
    { title: 'Sonora', url: '/guia-sonora', icon: 'volume-high' },     
    { title: 'Guia Visual', url: '/guia-visual', icon: 'eye-outline' },
    { title: 'Ajustes', url: '/ajustes', icon: 'settings' }, 
    { title: 'Llamada', url: '/llamada-emergencias', icon: 'call' } 
  ];

  constructor(private ajustesService: AjustesService) {
    // Registro de los iconos personalizados que se usarán en el menú
    addIcons({ 
      homeSharp,
      volumeHigh,
      eyeOutline,
      settings,
      call // Icono de llamada agregado
    });
  }

  // Método del ciclo de vida Angular que se ejecuta al inicializar el componente
  async ngOnInit() {
    // Carga los ajustes guardados y los aplica al iniciar la app
    const ajustes = await this.ajustesService.cargarAjustes();
    this.ajustesService.aplicarAjustes(ajustes); 
  }
}
