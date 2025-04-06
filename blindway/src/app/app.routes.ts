import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'folder/inbox',
    pathMatch: 'full',
  },
  {
    path: 'folder/:id',
    loadComponent: () =>
      import('./folder/folder.page').then((m) => m.FolderPage),
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
    path: 'ajustes',
    loadComponent: () => import('./ajustes/ajustes.page').then( m => m.AjustesPage)
  },
];
