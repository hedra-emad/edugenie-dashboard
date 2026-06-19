import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminUsersService } from './services/admin-users.service';
import { UserRole } from '../../../core/models/user-profile.model';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatMenuModule, MatSnackBarModule, MatDividerModule],
  templateUrl: './users.page.html',
  styleUrl: './users.page.css',
})
export class AdminUsersPageComponent {
  private readonly adminUsersService = inject(AdminUsersService);
  private readonly snackBar = inject(MatSnackBar);

  users = [
    {
      id: '1',
      name: 'Sarah Jenkins',
      joined: 'Joined 2 mos ago',
      email: 's.jenkins@edu.co',
      role: 'student' as UserRole,
      status: 'Active',
      avatar: 'https://i.pravatar.cc/150?u=sarah'
    },
    {
      id: '2',
      name: 'Dr. Marcus Chen',
      joined: 'Joined 1 yr ago',
      email: 'm.chen@edu.co',
      role: 'instructor' as UserRole,
      status: 'Active',
      avatar: 'https://i.pravatar.cc/150?u=marcus'
    },
    {
      id: '3',
      name: 'Elena Rodriguez',
      joined: 'Joined 3 yrs ago',
      email: 'e.rodriguez@edu.co',
      role: 'admin' as UserRole,
      status: 'Inactive',
      avatar: 'https://i.pravatar.cc/150?u=elena'
    }
  ];

  isChangingRole = false;

  changeRole(user: any, newRole: UserRole) {
    if (user.role === newRole) return;

    const previousRole = user.role;
    user.role = newRole; // Optimistic update
    this.isChangingRole = true;

    this.adminUsersService.changeUserRole(user.id, newRole).subscribe({
      next: () => {
        this.isChangingRole = false;
        this.snackBar.open(`Successfully updated role to ${newRole}`, 'Close', {
          duration: 3000,
          panelClass: ['bg-green-600', 'text-white']
        });
      },
      error: (err) => {
        this.isChangingRole = false;
        user.role = previousRole; // Revert on failure
        const errorMsg = err?.error?.message || 'Failed to update role';
        this.snackBar.open(errorMsg, 'Close', {
          duration: 3000,
          panelClass: ['bg-red-600', 'text-white']
        });
      }
    });
  }
}

