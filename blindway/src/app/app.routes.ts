import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'principal',
    pathMatch: 'full',
  },
  {
    path: 'principal',
    loadComponent: () => import('./principal/principal.page').then( m => m.PrincipalPage)
  },
  {
    path: 'guia-visual',
    loadComponent: () => import('./guia-visual/guia-visual.page').then( m => m.GuiaVisualPage)
  },
  {
    path: 'guia-sonora',
    loadComponent: () => import('./guia-sonora/guia-sonora.page').then( m => m.GuiaSonoraPage)
  },
  {
    path: 'llamada-emergencias',
    loadComponent: () => import('./llamada-emergencias/llamada-emergencias.page').then( m => m.LlamadaEmergenciasPage)
  },

];
