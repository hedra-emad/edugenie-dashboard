import {
  Component, HostListener, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { SidebarComponent } from '../../shared/components/layout/sidebar/sidebar.component';
import { NotificationsService } from '../../core/services/notifications';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterOutlet, MatIconModule, SidebarComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly notificationsService = inject(NotificationsService);

  readonly unreadCount$ = this.notificationsService.unreadCount$;

  sidebarExpanded = true;
  isMobile = false;
  isTablet = false;

  ngOnInit(): void {
    this.checkScreenSize();
    // Load initial unread count. Real-time updates come via
    // NotificationsService.connectPusher() which was already called by
    // AuthService.setCurrentUser() during the login/redeem flow.
    this.notificationsService.getNotifications(1, 10);
  }

  ngOnDestroy(): void {
    // NotificationsService is a root singleton — Pusher stays alive
    // across navigation. Only disconnect on logout (handled by clearCurrentUser).
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    const w = window.innerWidth;
    const wasMobile = this.isMobile;
    const wasTablet = this.isTablet;

    this.isMobile = w < 768;
    this.isTablet = w >= 768 && w < 1024;

    if (this.isMobile !== wasMobile || this.isTablet !== wasTablet) {
      if (this.isMobile || this.isTablet) {
        this.sidebarExpanded = false;
      } else {
        this.sidebarExpanded = true;
      }
      this.cdr.markForCheck();
    }
  }

  toggleSidebar(): void {
    this.sidebarExpanded = !this.sidebarExpanded;
    this.cdr.markForCheck();
  }

  closeOverlaySidebar(): void {
    if (this.isMobile || this.isTablet) {
      this.sidebarExpanded = false;
      this.cdr.markForCheck();
    }
  }
}