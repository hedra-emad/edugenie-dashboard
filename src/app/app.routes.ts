import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/layout/layout.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./features/auth/login/pages/login.page').then(m => m.LoginPageComponent) },
  { path: 'register', loadComponent: () => import('./features/auth/register/pages/register.page').then(m => m.RegisterPageComponent) },
  { path: 'forgot-password', loadComponent: () => import('./features/auth/forgot-password/pages/forgot-password.page').then(m => m.ForgotPasswordPageComponent) },
  { path: 'reset-password', loadComponent: () => import('./features/auth/reset-password/pages/reset-password.page').then(m => m.ResetPasswordPageComponent) }, 
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component')
              .then(m => m.DashboardComponent)
      }
    ]
  }
];
