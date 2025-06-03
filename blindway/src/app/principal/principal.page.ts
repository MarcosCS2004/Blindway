import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons , IonMenuButton, IonButton} from '@ionic/angular/standalone';
import { Router } from '@angular/router';

@Component({
  selector: 'app-principal',
  templateUrl: './principal.page.html',
  styleUrls: ['./principal.page.scss'],
  standalone: true,
  imports: [IonButton, IonButtons,IonMenuButton, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class PrincipalPage implements OnInit {

  constructor(private router: Router) { }

  ngOnInit() {
  }

  goToVisual(){
    this.router.navigate(['/guia-visual']);
  }

  goToSonora(){
    this.router.navigate(['/guia-sonora']);
  }

  goToAjustes(){
    this.router.navigate(['/ajustes'])
  }

  goToLlamada(){
    this.router.navigate(['/llamada-emergencias'])
  }

}
