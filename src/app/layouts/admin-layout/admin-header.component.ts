import { Component, EventEmitter, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { UserProfile } from '../../core/models/user-profile.model';
import { NotificationsService } from '../../core/services/notifications';

@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './admin-header.component.html',
  styleUrl: './admin-header.component.css'
})
export class AdminHeaderComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly notificationsService = inject(NotificationsService);

  readonly unreadCount$ = this.notificationsService.unreadCount$;

  @Output() toggleSidebar = new EventEmitter<void>();

  adminUser: UserProfile | null = null;
  showProfileMenu = false;
  showNotifications = false;
  unreadNotifications = 3;

  notificationsList = [
    { id: 1, text: 'New instructor registration request', time: '5m ago', unread: true },
    { id: 2, text: 'Course "Advanced Angular" submitted for approval', time: '1h ago', unread: true },
    { id: 3, text: 'High refund rate alert on course "Node.js Basics"', time: '4h ago', unread: true }
  ];

  ngOnInit(): void {
    // Get the current user from authService
    this.authService.waitForAuthInit().subscribe(() => {
      this.adminUser = this.authService.getCurrentUser();
    });
    this.notificationsService.getNotifications(1, 1);
  }

  get adminInitials(): string {
    if (!this.adminUser) return 'A';
    const first = this.adminUser.firstName ? this.adminUser.firstName.charAt(0) : '';
    const last = this.adminUser.lastName ? this.adminUser.lastName.charAt(0) : '';
    return (first + last).toUpperCase() || 'A';
  }

  toggleProfile(): void {
    this.showProfileMenu = !this.showProfileMenu;
    this.showNotifications = false;
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    this.showProfileMenu = false;
  }

  clearNotifications(): void {
    this.unreadNotifications = 0;
    this.notificationsList.forEach(n => n.unread = false);
  }

  logout(): void {
    this.authService.logout().subscribe();
  }
}
