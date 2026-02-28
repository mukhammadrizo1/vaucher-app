import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { App } from './app';

export const routes: Routes = [
  { path: '', component: App },
  { path: 'dashboard', component: DashboardComponent }
];
