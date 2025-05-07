import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons , IonMenuButton, IonButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-llamada-emergencias',
  templateUrl: './llamada-emergencias.page.html',
  styleUrls: ['./llamada-emergencias.page.scss'],
  standalone: true,
  imports: [IonButton, IonButtons,IonMenuButton,IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class LlamadaEmergenciasPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
