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
  call // Icono añadido para llamada
} from 'ionicons/icons';
import { AjustesService } from './service/ajustes.service';

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
export class AppComponent implements OnInit{
  public appPages = [
    { title: 'Principal', url: '/principal', icon: 'home-sharp' },    
    { title: 'Sonora', url: '/guia-sonora', icon: 'volume-high' },     
    { title: 'Guia Visual', url: '/guia-visual', icon: 'eye-outline' },
    { title: 'Ajustes', url: '/ajustes', icon: 'settings' }, 
    { title: 'Llamada', url: '/llamada-emergencias', icon: 'call' } 
  ];

  constructor(private ajustesService: AjustesService) {
    addIcons({ 
      homeSharp,
      volumeHigh,
      eyeOutline,
      settings,
      call // Icono añadido para llamada
    });
  }
    async ngOnInit() {
    const ajustes = await this.ajustesService.cargarAjustes();
    this.ajustesService.aplicarAjustes(ajustes); // ✅ Se aplican al arrancar la app
  }
}