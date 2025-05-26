import { Component } from '@angular/core';
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
  call // Icono añadido para llamada
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [
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
export class AppComponent {
  public appPages = [
    { title: 'Principal', url: '/principal', icon: 'home-sharp' },    
    { title: 'Sonora', url: '/guia-sonora', icon: 'volume-high' },     
    { title: 'Guia Visual', url: '/guia-visual', icon: 'eye-outline' },
    { title: 'Ajustes', url: '/ajustes', icon: 'settings' }, 
    { title: 'Llamada', url: '/llamada-emergencias', icon: 'call' } 
  ];

  constructor() {
    addIcons({ 
      homeSharp,
      volumeHigh,
      eyeOutline,
      settings,
      call // Icono añadido para llamada
    });
  }
}