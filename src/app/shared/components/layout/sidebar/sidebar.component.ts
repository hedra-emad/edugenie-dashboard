import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/services/auth.service';

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
export class SidebarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  @Input() isMobile = false;
  @Input() isTablet = false;
  @Input() sidebarExpanded = true;
  @Output() toggle = new EventEmitter<void>();

  readonly adminNavItems: NavItem[] = [
    { icon: 'grid_view',             label: 'Overview',      route: '/admin/analytics' },
    { icon: 'fact_check',            label: 'Approvals',     route: '/admin/course-approvals' },
    { icon: 'group',                 label: 'Users',         route: '/admin/users' },
    { icon: 'category',              label: 'Categories',    route: '/admin/categories' },
    { icon: 'bar_chart',             label: 'Reports',       route: '/admin/reports' },
    { icon: 'admin_panel_settings',  label: 'Admins',        route: '/admin/admins' },
    { icon: 'notifications',         label: 'Notifications', route: '/admin/notifications' },
  ];

  readonly instructorNavItems: NavItem[] = [
    { icon: 'menu_book',  label: 'My Courses', route: '/my-courses' },
    { icon: 'analytics',  label: 'Analytics',  route: '/analytics' },
    { icon: 'settings',   label: 'Settings',   route: '/settings' },
  ];

  readonly adminBottomItems: NavItem[] = [
    { icon: 'help_outline', label: 'Support Center', route: '/admin/support' },
    { icon: 'settings',     label: 'Settings',       route: '/admin/settings' },
  ];

  readonly instructorBottomItems: NavItem[] = [];

  get navItems(): NavItem[] {
    return this.user?.role === 'admin'
      ? this.adminNavItems
      : this.instructorNavItems;
  }

  get bottomItems(): NavItem[] {
    return this.user?.role === 'admin'
      ? this.adminBottomItems
      : this.instructorBottomItems;
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
        this.toggle.emit();
      });
    }
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      next:  () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }
}