import { ActivatedRoute, Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/layout/layout.component';
import { authGuard } from './core/guards/auth.guard';

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
        path: 'analytics',
        loadComponent: () =>
          import('./features/instructor-analytics/instructor-analytics.page')
            .then(m => m.InstructorAnalyticsPageComponent)
      },
      {
        path: 'course-builder',
        loadComponent: () =>
          import('./features/course-builder/pages/create-course-page/create-course-page.component')
            .then(m => m.CreateCoursePageComponent)
      },
      {
        path: 'course-builder/:id',
        loadComponent: () =>
          import('./features/course-builder/pages/create-course-page/create-course-page.component')
            .then(m => m.CreateCoursePageComponent)
      },
      {
        path: 'settings',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/settings/pages/account-settings/account-settings.page')
            .then(m => m.AccountSettingsPageComponent)
      },
      {
        path: 'my-courses',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/instructor/courses-list/courses-list.component')
            .then(m => m.CoursesListComponent)
      }
    ]
  }
];
