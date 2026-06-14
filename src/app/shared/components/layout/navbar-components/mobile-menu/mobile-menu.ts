import { Component, EventEmitter, Output } from '@angular/core';
import { RouterModule } from '@angular/router';

import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { inject } from '@angular/core';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-mobile-menu',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIcon],
  templateUrl: './mobile-menu.html',
})
export class MobileMenuComponent {
  authService = inject(AuthService);

  get user() {
    return this.authService.currentUserSignal();
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => this.closeMenu.emit(),
    });
  }
  @Output() closeMenu = new EventEmitter<void>();
}
