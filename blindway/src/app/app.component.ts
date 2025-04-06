
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonListHeader, IonNote, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterOutlet, IonRouterLink } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  homeSharp,           // Icono de casa
  volumeHigh,          // Icono de altavoz
  eyeOutline           // Icono de ojo (outline)
} from 'ionicons/icons';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [RouterLink, RouterLinkActive, IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonListHeader, IonNote, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterLink, IonRouterOutlet],
})
export class AppComponent {
  public appPages = [
    { title: 'Principal', url: '/principal', icon: 'home-sharp' },    // Casa (estilo sharp)
    { title: 'Sonora', url: '/guia-sonora', icon: 'volume-high' },     // Altavoz (filled)
    { title: 'Guia Visual', url: '/guia-visual', icon: 'eye-outline' },// Ojo (estilo outline)
  ];
  public labels = [];
  constructor() {
    addIcons({ homeSharp,volumeHigh,eyeOutline });
  }
}
