import { ActivatedRoute, Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/layout/layout.component';
import { authGuard } from './core/guards/auth.guard';
import { LessonCardComponent } from './features/course-builder/components/lesson-card/lesson-card.component';
import { CourseBuilderPageComponent } from './features/course-builder/pages/course-builder-page/course-builder-page.component';

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
        path: 'my-courses',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/instructor/courses-list/courses-list.component')
            .then(m => m.CoursesListComponent)
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./features/instructor-analytics/instructor-analytics.page')
            .then(m => m.InstructorAnalyticsPageComponent)
      },

      {
  path: 'course-builder/:courseId',
  component: CourseBuilderPageComponent,
  children: [
    {
      path: 'basic',
      loadComponent: () =>
        import('./features/course-builder/pages/course-basic-info/course-basic-info.component')
          .then(m => m.CourseBasicInfoComponent)
    },
    {
      path: 'curriculum',
      loadComponent: () =>
        import('./features/course-builder/pages/section-builder/section-builder.component')
          .then(m => m.SectionBuilderComponent)
    },
     {
      path: 'sections/:sectionId/lessons',
      loadComponent: () =>
        import('./features/course-builder/pages/lesson-builder/lesson-builder')
          .then(m => m.LessonBuilder)
    },
    {
      path: '',
      redirectTo: 'basic',
      pathMatch: 'full'
    }
  ]
},
      {
        path: 'settings',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/settings/pages/account-settings/account-settings.page')
            .then(m => m.AccountSettingsPageComponent)
      },

    ]
  }
];
