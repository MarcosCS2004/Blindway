// Importaciones necesarias de Angular, Ionic y el enrutador
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
  IonButton
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';

@Component({
  selector: 'app-principal', 
  templateUrl: './principal.page.html', 
  styleUrls: ['./principal.page.scss'], 
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
  ] // Módulos y componentes que se usan en la plantilla
})
export class PrincipalPage implements OnInit {

  // Se inyecta el Router para la navegación entre páginas
  constructor(private router: Router) { }

  ngOnInit() {
  }

  // Navega a la página de la guía visual
  goToVisual() {
    this.router.navigate(['/guia-visual']);
  }

  // Navega a la página de la guía sonora
  goToSonora() {
    this.router.navigate(['/guia-sonora']);
  }

  // Navega a la página de ajustes
  goToAjustes() {
    this.router.navigate(['/ajustes']);
  }

  // Navega a la página de llamada de emergencias
  goToLlamada() {
    this.router.navigate(['/llamada-emergencias']);
  }
}
