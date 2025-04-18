import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons , IonMenuButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-guia-visual',
  templateUrl: './guia-visual.page.html',
  styleUrls: ['./guia-visual.page.scss'],
  standalone: true,
  imports: [IonContent,IonButtons, IonHeader, IonTitle,IonMenuButton, IonToolbar, CommonModule, FormsModule]
})
export class GuiaVisualPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
