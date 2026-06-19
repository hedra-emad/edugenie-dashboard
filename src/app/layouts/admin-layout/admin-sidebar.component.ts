import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  icon: string;
  label: string;
  route: string;
}

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './admin-sidebar.component.html',
  styleUrl: './admin-sidebar.component.css'
})
export class AdminSidebarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  @Input() isMobile = false;
  @Input() isTablet = false;
  @Input() sidebarExpanded = true;
  @Output() toggle = new EventEmitter<void>();

  readonly navItems: NavItem[] = [
    { icon: 'grid_view',     label: 'Overview',      route: '/admin/dashboard' },
    { icon: 'fact_check',    label: 'Approvals',     route: '/admin/course-approvals' },
    { icon: 'group',         label: 'Users',         route: '/admin/users' },
    { icon: 'category',      label: 'Categories',    route: '/admin/categories' },
    { icon: 'bar_chart',     label: 'Reports',       route: '/admin/reports' },
    { icon: 'shield_person', label: 'Admins',        route: '/admin/admins' },
    { icon: 'notifications', label: 'Notifications', route: '/admin/notifications' },
  ];

  readonly bottomItems: NavItem[] = [
    { icon: 'help_outline', label: 'Support Center', route: '/admin/support' },
    { icon: 'settings',     label: 'Settings',       route: '/admin/settings' },
  ];

  /** True when sidebar should behave as an off-canvas overlay */
  get isOverlay(): boolean {
    return this.isMobile || this.isTablet;
  }

  /** Show text labels? Yes on desktop-expanded; yes in overlay when open */
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

  /**
   * Navigate to route, then close overlay sidebar.
   * Router.navigate().then() ensures the route change is committed
   * before the sidebar emits toggle — prevents the race condition
   * where ChangeDetection re-renders the layout mid-navigation.
   */
  onNavClick(route: string): void {
    if (this.isOverlay) {
      this.router.navigate([route]).then(() => {
        this.toggle.emit();
      });
    }
    // Desktop: [routerLink] handles navigation normally, no toggle needed
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      next:  () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }
}
