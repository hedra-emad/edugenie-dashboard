import { Component, EventEmitter, Input, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationsService } from '../../../../core/services/notifications';

interface NavItem {
  icon: string;
  label: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationsService = inject(NotificationsService);

  readonly unreadCount$ = this.notificationsService.unreadCount$;

  ngOnInit(): void {
    this.notificationsService.getNotifications(1, 1);
  }

  @Input() isMobile = false;
  @Input() isTablet = false;
  @Input() sidebarExpanded = true;
  @Output() toggled = new EventEmitter<void>();

  readonly adminNavItems: NavItem[] = [
    { icon: 'grid_view', label: 'Overview', route: '/admin/analytics' },
    { icon: 'fact_check', label: 'Approvals', route: '/admin/course-approvals' },
    { icon: 'group', label: 'Users', route: '/admin/users' },
    { icon: 'category', label: 'Categories', route: '/admin/categories' },
    { icon: 'notifications', label: 'Notifications', route: '/admin/notifications' },
  ];

  readonly instructorNavItems: NavItem[] = [
    { icon: 'menu_book', label: 'My Courses', route: '/my-courses' },
    { icon: 'analytics', label: 'Analytics', route: '/analytics' },
    { icon: 'notifications', label: 'Notifications', route: '/notifications' },
  ];

  readonly adminBottomItems: NavItem[] = [
    { icon: 'settings', label: 'Account Settings', route: '/admin/settings' },
  ];

  readonly instructorBottomItems: NavItem[] = [
    { icon: 'settings', label: 'Account Settings', route: '/settings' },
  ];

  readonly superadminNavItems: NavItem[] = [
    { icon: 'dashboard', label: 'Dashboard', route: '/admin/command-center' },
    { icon: 'admin_panel_settings', label: 'Admins', route: '/admin/admins' },
    { icon: 'payments', label: 'Payouts', route: '/admin/payouts' },
    { icon: 'tune', label: 'Platform Config', route: '/admin/platform-config' },
    { icon: 'history', label: 'Audit Logs', route: '/admin/audit-logs' },
    { icon: 'group', label: 'Users', route: '/admin/users' },
    { icon: 'fact_check', label: 'Approvals', route: '/admin/course-approvals' },
    { icon: 'category', label: 'Categories', route: '/admin/categories' },
    { icon: 'notifications', label: 'Notifications', route: '/admin/notifications' },
  ];

  readonly superadminBottomItems: NavItem[] = [
    { icon: 'settings', label: 'Account Settings', route: '/admin/settings' },
  ];

  get navItems(): NavItem[] {
    const role = this.user?.role;
    if (role === 'superadmin') return this.superadminNavItems;
    if (role === 'admin') return this.adminNavItems;
    return this.instructorNavItems;
  }

  get bottomItems(): NavItem[] {
    const role = this.user?.role;
    if (role === 'superadmin') return this.superadminBottomItems;
    if (role === 'admin') return this.adminBottomItems;
    return this.instructorBottomItems;
  }

  get isOverlay(): boolean {
    return this.isMobile || this.isTablet;
  }

  get showLabel(): boolean {
    return this.sidebarExpanded;
  }

  get user() {
    return this.authService.currentUserSignal();
  }

  get userInitials(): string {
    const u = this.user;
    if (!u) return '';
    return ((u.firstName?.charAt(0) ?? '') + (u.lastName?.charAt(0) ?? '')).toUpperCase();
  }

  onNavClick(route: string): void {
    if (this.isOverlay) {
      this.router.navigate([route]).then(() => {
        this.toggled.emit();
      });
    }
  }

  goToSettings(): void {
    if (this.router.url !== '/admin/settings') {
      this.router.navigate(['/admin/settings']);
    }
  }

  onLogout(): void {
    this.authService.logout().subscribe();
  }
}