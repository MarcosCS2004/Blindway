import { Routes } from '@angular/router';

// Definición de las rutas de la aplicación
export const routes: Routes = [
  {
    path: '',               // Ruta raíz (cuando la URL está vacía)
    redirectTo: 'principal', // Redirige automáticamente a la página 'principal'
    pathMatch: 'full',      // Coincidencia exacta del path para hacer la redirección
  },
  {
    path: 'principal',      // Ruta para la página principal
    loadComponent: () => import('./principal/principal.page').then(m => m.PrincipalPage)
    // Carga perezosa (lazy loading) del componente PrincipalPage para optimizar la app
  },
  {
    path: 'guia-visual',    // Ruta para la guía visual
    loadComponent: () => import('./guia-visual/guia-visual.page').then(m => m.GuiaVisualPage)
  },
  {
    path: 'guia-sonora',    // Ruta para la guía sonora
    loadComponent: () => import('./guia-sonora/guia-sonora.page').then(m => m.GuiaSonoraPage)
  },
  {
    path: 'llamada-emergencias', // Ruta para la página de llamada de emergencias
    loadComponent: () => import('./llamada-emergencias/llamada-emergencias.page').then(m => m.LlamadaEmergenciasPage)
  },
  {
    path: 'ajustes',        // Ruta para la página de ajustes
    loadComponent: () => import('./ajustes/ajustes.page').then(m => m.AjustesPage)
  },
];
