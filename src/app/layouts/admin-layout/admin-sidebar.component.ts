import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

interface SidebarMenuItem {
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

  menuItems: SidebarMenuItem[] = [
    { icon: 'grid_view', label: 'Overview', route: '/admin/dashboard' },
    { icon: 'fact_check', label: 'Approvals', route: '/admin/course-approvals' },
    { icon: 'group', label: 'Users', route: '/admin/users' },
    { icon: 'category', label: 'Categories', route: '/admin/categories' },
    { icon: 'bar_chart', label: 'Reports', route: '/admin/reports' },
    { icon: 'shield_person', label: 'Admins', route: '/admin/admins' }
  ];

  bottomItems: SidebarMenuItem[] = [
    { icon: 'help_outline', label: 'Support Center', route: '/admin/support' },
    { icon: 'settings', label: 'Settings', route: '/admin/settings' }
  ];

  get isCollapsed(): boolean {
    if (this.isMobile) {
      return !this.sidebarExpanded;
    }
    if (this.isTablet) {
      return true; // Collapsed automatically on tablet
    }
    return !this.sidebarExpanded;
  }
  
  get user() {
    return this.authService.currentUserSignal();
  }

  get userInitials(): string {
    const u = this.user;
    if (!u) return '';
    const first = u.firstName ? u.firstName.charAt(0).toUpperCase() : '';
    const last = u.lastName ? u.lastName.charAt(0).toUpperCase() : '';
    return first + last;
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Logout failed', err);
        this.router.navigate(['/login']);
      }
    });
  }
}
