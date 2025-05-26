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
  IonRadioGroup, IonIcon } from '@ionic/angular/standalone';


@Component({
  selector: 'app-ajustes',
  templateUrl: './ajustes.page.html',
  styleUrls: ['./ajustes.page.scss'],
  standalone: true,
  imports: [IonIcon, 
    IonRadioGroup,
    IonItem,
    IonLabel,
    IonRadio,
    IonGrid,
    IonRow,
    IonCol,
    IonButton,
    IonButtons,
    IonMenuButton,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule
  ]
})
export class AjustesPage implements OnInit {

  tamanioSeleccionado: string = 'medio';
  temaSeleccionado: string = 'claro';

  constructor() { }

  ngOnInit() {
    this.aplicarTamanio(this.tamanioSeleccionado);
    this.aplicarTema(this.temaSeleccionado);
  }

  onTamanioChange(event: any) {
    this.tamanioSeleccionado = event.detail.value;
    console.log('Tamaño seleccionado:', this.tamanioSeleccionado);
    this.aplicarTamanio(this.tamanioSeleccionado);
  }

  onTemaChange(event: any) {
    this.temaSeleccionado = event.detail.value;
    console.log('Tema seleccionado:', this.temaSeleccionado);
    this.aplicarTema(this.temaSeleccionado);
  }

  mostrarAcercaDe = false;

  onAcercaDe() {
    this.mostrarAcercaDe = true;
  }

  volverAtras() {
    this.mostrarAcercaDe = false;
  }


  private aplicarTamanio(tamanio: string) {
    const body = document.body;
    body.classList.remove('font-small', 'font-medium', 'font-large');

    switch (tamanio) {
      case 'pequeño':
        body.classList.add('font-small');
        break;
      case 'medio':
        body.classList.add('font-medium');
        break;
      case 'grande':
        body.classList.add('font-large');
        break;
    }
  }

  private aplicarTema(tema: string) {
    const body = document.body;
    body.classList.remove('theme-light', 'theme-dark');

    switch (tema) {
      case 'claro':
        body.classList.add('theme-light');
        break;
      case 'oscuro':
        body.classList.add('theme-dark');
        break;
    }
  }
}
