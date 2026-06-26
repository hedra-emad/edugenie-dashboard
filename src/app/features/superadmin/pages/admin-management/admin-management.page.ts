import { Component, inject, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SuperadminService } from '../../services/superadmin.service';
import { AdminListItem, AdminActivityItem } from '../../models/superadmin.models';
import { UserRole } from '../../../../core/models/user-profile.model';

@Component({
  selector: 'app-admin-management',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatMenuModule, MatSnackBarModule],
  templateUrl: './admin-management.page.html',
  styleUrl: './admin-management.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminManagementPageComponent implements OnInit {
  private readonly superadminService = inject(SuperadminService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  isLoading = true;
  admins: AdminListItem[] = [];

  // Modal State
  showActivityModal = false;
  selectedAdmin: AdminListItem | null = null;
  
  // Activity Pagination
  isActivityLoading = false;
  activities: AdminActivityItem[] = [];
  activityPage = 1;
  activityTotalPages = 1;
  activityLimit = 10;

  // Change Role Modal State
  showRoleModal = false;
  roleTargetAdmin: AdminListItem | null = null;
  newRole: UserRole | string = '';
  confirmSuperAdminChange = false;
  isChangingRole = false;

  ngOnInit() {
    this.loadAdmins();
  }

  loadAdmins() {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.superadminService.getAdmins().subscribe({
      next: (data) => {
        this.admins = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load admins', err);
        this.isLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open('Failed to load admins', 'Close', { duration: 3000 });
      }
    });
  }

  getAvatarUrl(user: AdminListItem): string {
    // Note: The backend getAdmins endpoint currently does not return avatars.
    // If it did, this method would handle the formatting.
    return '';
  }

  openActivityModal(admin: AdminListItem) {
    this.selectedAdmin = admin;
    this.showActivityModal = true;
    this.activityPage = 1;
    this.activities = [];
    this.loadActivities();
  }

  closeActivityModal() {
    this.showActivityModal = false;
    this.selectedAdmin = null;
    this.activities = [];
  }

  loadActivities() {
    if (!this.selectedAdmin) return;
    this.isActivityLoading = true;
    this.cdr.detectChanges();

    this.superadminService.getAdminActivity(this.selectedAdmin.id, this.activityPage, this.activityLimit).subscribe({
      next: (res) => {
        this.activities = res.data;
        this.activityTotalPages = res.meta.totalPages || 1;
        this.isActivityLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load admin activities', err);
        this.isActivityLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open('Failed to load admin activities', 'Close', { duration: 3000 });
      }
    });
  }

  get activityPageNumbers(): number[] {
    return Array.from({length: this.activityTotalPages}, (_, i) => i + 1);
  }

  setActivityPage(page: number) {
    if (page >= 1 && page <= this.activityTotalPages && page !== this.activityPage) {
      this.activityPage = page;
      this.loadActivities();
    }
  }

  // --- Change Role Logic ---
  openRoleModal(admin: AdminListItem) {
    this.roleTargetAdmin = admin;
    this.newRole = admin.role;
    this.confirmSuperAdminChange = false;
    this.showRoleModal = true;
  }

  closeRoleModal() {
    if (this.isChangingRole) return;
    this.showRoleModal = false;
    this.roleTargetAdmin = null;
  }

  confirmRoleChange() {
    if (!this.roleTargetAdmin || !this.newRole) return;
    
    this.isChangingRole = true;
    this.cdr.detectChanges();

    this.superadminService.changeUserRole(
      this.roleTargetAdmin.id, 
      this.newRole, 
      this.confirmSuperAdminChange
    ).subscribe({
      next: (res) => {
        this.isChangingRole = false;
        this.showRoleModal = false;
        this.roleTargetAdmin = null;
        this.cdr.detectChanges();
        this.snackBar.open('User role updated successfully.', 'Close', { duration: 3000, panelClass: ['bg-green-600', 'text-white'] });
        this.loadAdmins();
      },
      error: (err) => {
        this.isChangingRole = false;
        this.cdr.detectChanges();
        const errorMsg = err?.error?.message || 'Failed to update user role';
        this.snackBar.open(errorMsg, 'Close', { duration: 3000, panelClass: ['bg-red-600', 'text-white'] });
      }
    });
  }
}
