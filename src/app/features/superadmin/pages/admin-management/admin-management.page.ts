import { Component, inject, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SuperadminService } from '../../services/superadmin.service';
import { AdminListItem, AdminActivityItem, InviteAdminResponse } from '../../models/superadmin.models';
import { ButtonLoadingComponent, PageSkeletonComponent } from '../../../../shared/components/loading';

@Component({
  selector: 'app-admin-management',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatMenuModule, MatSnackBarModule, ButtonLoadingComponent, PageSkeletonComponent],
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

  // Invite Admin Modal State
  showInviteModal = false;
  isInviting = false;
  inviteFirstName = '';
  inviteLastName = '';
  inviteEmail = '';
  inviteResult: InviteAdminResponse | null = null;

  // Revoke/unrevoke in-flight guard (per admin id)
  rowBusyId: string | null = null;

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

  // --- Invite Admin ---
  openInviteModal() {
    this.inviteFirstName = '';
    this.inviteLastName = '';
    this.inviteEmail = '';
    this.inviteResult = null;
    this.showInviteModal = true;
  }

  closeInviteModal() {
    if (this.isInviting) return;
    this.showInviteModal = false;
    this.inviteResult = null;
  }

  get isInviteValid(): boolean {
    return (
      this.inviteFirstName.trim().length >= 2 &&
      this.inviteLastName.trim().length >= 2 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.inviteEmail.trim())
    );
  }

  submitInvite() {
    if (!this.isInviteValid || this.isInviting) return;
    this.isInviting = true;
    this.cdr.detectChanges();

    this.superadminService.inviteAdmin({
      firstName: this.inviteFirstName.trim(),
      lastName: this.inviteLastName.trim(),
      email: this.inviteEmail.trim(),
    }).subscribe({
      next: (res) => {
        this.isInviting = false;
        this.inviteResult = res;
        this.cdr.detectChanges();
        const msg = res.emailSent
          ? `Invitation emailed to ${res.email}.`
          : `Invitation created for ${res.email}. Share the link below.`;
        this.snackBar.open(msg, 'Close', { duration: 4000, panelClass: ['bg-green-600', 'text-white'] });
      },
      error: (err) => {
        this.isInviting = false;
        this.cdr.detectChanges();
        const errorMsg = err?.error?.message || 'Failed to send invitation';
        this.snackBar.open(errorMsg, 'Close', { duration: 4000, panelClass: ['bg-red-600', 'text-white'] });
      }
    });
  }

  copyInviteUrl() {
    if (!this.inviteResult?.inviteUrl) return;
    navigator.clipboard?.writeText(this.inviteResult.inviteUrl).then(() => {
      this.snackBar.open('Invite link copied', 'Close', { duration: 2000 });
    });
  }

  // --- Revoke / Unrevoke admin access ---
  isRevoked(admin: AdminListItem): boolean {
    return admin.status === 'deactivated';
  }

  revokeAdmin(admin: AdminListItem) {
    if (this.rowBusyId) return;
    this.rowBusyId = admin.id;
    this.cdr.detectChanges();

    this.superadminService.revokeAdmin(admin.id).subscribe({
      next: () => {
        this.rowBusyId = null;
        this.snackBar.open(`Revoked admin access for ${admin.name}.`, 'Close', { duration: 3000, panelClass: ['bg-green-600', 'text-white'] });
        this.loadAdmins();
      },
      error: (err) => {
        this.rowBusyId = null;
        this.cdr.detectChanges();
        this.snackBar.open(err?.error?.message || 'Failed to revoke admin', 'Close', { duration: 3000, panelClass: ['bg-red-600', 'text-white'] });
      }
    });
  }

  unrevokeAdmin(admin: AdminListItem) {
    if (this.rowBusyId) return;
    this.rowBusyId = admin.id;
    this.cdr.detectChanges();

    this.superadminService.unrevokeAdmin(admin.id).subscribe({
      next: () => {
        this.rowBusyId = null;
        this.snackBar.open(`Restored admin access for ${admin.name}.`, 'Close', { duration: 3000, panelClass: ['bg-green-600', 'text-white'] });
        this.loadAdmins();
      },
      error: (err) => {
        this.rowBusyId = null;
        this.cdr.detectChanges();
        this.snackBar.open(err?.error?.message || 'Failed to restore admin', 'Close', { duration: 3000, panelClass: ['bg-red-600', 'text-white'] });
      }
    });
  }
}
