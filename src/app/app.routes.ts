import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/layout/layout.component';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { roleGuard } from './core/guards/role.guard';
import { CourseBuilderPageComponent } from './features/course-builder/pages/course-builder-page/course-builder-page.component';
import {
  createPendingOperationsGuard,
  PendingOperationsGuard,
} from './core/guards/pending-operations.guard';
import { LessonBuilder } from './features/course-builder/pages/lesson-builder/lesson-builder';
import { SectionBuilderComponent } from './features/course-builder/pages/section-builder/section-builder.component';

// Create guard for components that implement HasPendingOperations (no instance needed - Angular passes the component)
const pendingOpsGuard = createPendingOperationsGuard<LessonBuilder>();

const courseBuilderChildren: Routes = [
  {
    path: 'basic',
    loadComponent: () =>
      import('./features/course-builder/pages/course-basic-info/course-basic-info.component').then(
        (m) => m.CourseBasicInfoComponent
      ),
  },
  {
    path: 'sections',
    loadComponent: () =>
      import('./features/course-builder/pages/section-builder/section-builder.component').then(
        (m) => m.SectionBuilderComponent
      ),
    canDeactivate: [pendingOpsGuard],
  },
  {
    path: 'sections/:sectionId/lessons',
    loadComponent: () =>
      import('./features/course-builder/pages/lesson-builder/lesson-builder').then(
        (m) => m.LessonBuilder
      ),
    canDeactivate: [pendingOpsGuard],
  },
  {
    path: 'sections/:sectionId/quiz-config',
    loadComponent: () =>
      import('./features/course-builder/pages/quiz-config/quiz-config.page').then(
        (m) => m.QuizConfigPageComponent
      ),
  },
  {
    path: '',
    redirectTo: 'basic',
    pathMatch: 'full',
  },
];

export const routes: Routes = [
  // The dashboard is an admin portal: entering it lands on the admin login.
  // (Instructors reach the dashboard via SSO handoff → /auth/redeem, not here.)
  { path: '', redirectTo: 'admin-login', pathMatch: 'full' },

  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login-redirect/login-redirect.component').then(
        (m) => m.LoginRedirectComponent
      ),
    // No guestGuard — even authenticated users who land here
    // by mistake should be sent to Next.js, not blocked
  },
  {
    // Dedicated Admin login — only admins and superadmins may complete login here
    path: 'admin-login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/pages/login.page').then((m) => m.LoginPageComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/pages/forgot-password.page').then(
        (m) => m.ForgotPasswordPageComponent
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/pages/reset-password.page').then(
        (m) => m.ResetPasswordPageComponent
      ),
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./features/auth/verify-email/verify-email.component').then(
        (m) => m.VerifyEmailComponent
      ),
  },
  {
    path: 'auth-callback',
    loadComponent: () =>
      import('./features/auth/auth-callback/pages/auth-callback.page').then(
        (m) => m.AuthCallbackPageComponent
      ),
  },
  {
    path: 'auth/redeem',
    loadComponent: () =>
      import('./features/auth/redeem/redeem.component').then((m) => m.RedeemComponent),
    // NO guards — this is the unauthenticated entry point
  },
  {
    path: 'accept-invite',
    loadComponent: () =>
      import('./features/auth/accept-invite/accept-invite.component').then(
        (m) => m.AcceptInviteComponent,
      ),
    // NO guards — new admins accept their invite before they have a session.
  },

  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: 'my-courses',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['instructor'] },
        loadComponent: () =>
          import('./features/instructor/courses-list/courses-list.component').then(
            (m) => m.CoursesListComponent
          ),
      },
      {
        path: 'analytics',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['instructor'] },
        loadComponent: () =>
          import('./features/instructor-analytics/instructor-analytics.page').then(
            (m) => m.InstructorAnalyticsPageComponent
          ),
      },
      {
        path: 'earnings',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['instructor'] },
        loadComponent: () =>
          import('./features/instructor/earnings/earnings.page').then(
            (m) => m.InstructorEarningsPageComponent
          ),
      },

      // -- YOUR COURSE BUILDER ROUTES MERGED WITH MAIN'S GUARDS --
      {
        path: 'course-builder',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['instructor', 'admin'] },
        children: [
          {
            path: '',
            component: CourseBuilderPageComponent,
            children: courseBuilderChildren,
          },
          {
            path: ':courseId',
            component: CourseBuilderPageComponent,
            children: courseBuilderChildren,
          },
        ],
      },
      {
        path: 'settings',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/settings/pages/account-settings/account-settings.page').then(
            (m) => m.AccountSettingsPageComponent
          ),
      },
      {
        path: 'notifications',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./shared/components/notifications-page/notifications-page.component').then(
            (m) => m.NotificationsPageComponent
          ),
      },
    ],
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./layouts/admin-layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['admin', 'superadmin'],
    },
    children: [
      {
        path: '',
        loadComponent: () => import('./features/admin/admin-home-redirect.component').then(m => m.AdminHomeRedirectComponent),
      },
      {
        path: 'command-center',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['superadmin'] },
        loadComponent: () =>
          import('./features/superadmin/pages/command-center/command-center.page')
            .then(m => m.CommandCenterPageComponent)
      },
      {
        path: 'admins',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['superadmin'] },
        loadComponent: () =>
          import('./features/superadmin/pages/admin-management/admin-management.page')
            .then(m => m.AdminManagementPageComponent)
      },
      {
        path: 'payouts',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['superadmin'] },
        loadComponent: () =>
          import('./features/superadmin/pages/payouts/payouts.page')
            .then(m => m.PayoutsPageComponent)
      },
      {
        path: 'platform-config',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['superadmin'] },
        loadComponent: () =>
          import('./features/superadmin/pages/platform-config/platform-config.page')
            .then(m => m.PlatformConfigPageComponent)
      },
      {
        path: 'audit-logs',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['superadmin'] },
        loadComponent: () =>
          import('./features/superadmin/pages/audit-logs/audit-logs.page')
            .then(m => m.AuditLogsPageComponent)
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./features/instructor-analytics/instructor-analytics.page').then(
            (m) => m.InstructorAnalyticsPageComponent
          ),
      },
      {
        path: 'course-approvals',
        loadComponent: () =>
          import(
            './features/admin/course-approvals/course-approvals-page/course-approvals-page.component'
          ).then((m) => m.CourseApprovalsPageComponent),
      },
      {
        path: 'courses/:id',
        loadComponent: () =>
          import(
            './features/admin/course-details/course-details-page/course-details-page.component'
          ).then((m) => m.CourseDetailsPageComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/admin/users/users.page').then((m) => m.AdminUsersPageComponent),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./features/admin/categories/categories-page/categories-page.component').then(
            (m) => m.CategoriesPageComponent
          ),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./shared/components/notifications-page/notifications-page.component').then(
            (m) => m.NotificationsPageComponent
          ),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/admin/placeholders').then((m) => m.AdminReportsComponent),
      },
      {
        path: 'support',
        loadComponent: () =>
          import('./features/admin/placeholders').then((m) => m.AdminSupportComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/pages/account-settings/account-settings.page').then(
            (m) => m.AccountSettingsPageComponent
          ),
      },
    ],
  },

  // 404 Catch-all route - MUST be last
  {
    path: '**',
    loadComponent: () =>
      import('./features/errors/not-found/not-found.page').then((m) => m.NotFoundPageComponent),
  },
];
