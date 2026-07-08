import { Component, inject, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ToastrService } from 'ngx-toastr';
import { AdminUsersService } from './services/admin-users.service';
import { UserRole } from '../../../core/models/user-profile.model';
import { Subject, Subscription, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { PageSkeletonComponent, ButtonLoadingComponent } from '../../../shared/components/loading';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';


@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatMenuModule, MatSnackBarModule, MatDividerModule, PageSkeletonComponent, ButtonLoadingComponent, PaginationComponent],
  templateUrl: './users.page.html',
  styleUrl: './users.page.css',
})
export class AdminUsersPageComponent implements OnInit, OnDestroy {
  private readonly adminUsersService = inject(AdminUsersService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toastr = inject(ToastrService);

  users: any[] = [];
  isLoading = true;
  totalUsers = 0;
  totalStudents = 0;
  totalInstructors = 0;
  totalPages = 1;
  currentPage = 1;
  pages: number[] = [1];
  limit = 10;
  pageSizeOptions = [10, 25, 50];

  get pageIndex(): number {
    return this.currentPage - 1;
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }

  get pageFrom(): number {
    return this.totalUsers === 0 ? 0 : (this.currentPage - 1) * this.limit + 1;
  }

  get pageTo(): number {
    return Math.min(this.currentPage * this.limit, this.totalUsers);
  }

  // Filters
  searchQuery = '';
  selectedRole = '';
  selectedStatus = '';

  // Block modal state
  showBlockModal = false;
  blockTarget: any = null;
  blockReason = '';
  isBlocking = false;
  blockSuccess = false;

  // Deactivate modal state
  showDeactivateModal = false;
  deactivateTarget: any = null;
  deactivateReason = '';
  isDeactivating = false;
  deactivateSuccess = false;

  // Export state
  isExporting = false;

  private searchSubject = new Subject<string>();
  private sub?: Subscription;

  ngOnInit() {
    this.loadUsers();

    this.sub = this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe((query) => {
      this.searchQuery = query;
      this.applyFilters();
    });
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }

  onSearchChange(event: any) {
    const value = event?.target?.value || '';
    this.searchQuery = value;
    this.searchSubject.next(value);
  }

  setRoleFilter(role: string) {
    this.selectedRole = role;
    this.applyFilters();
  }

  setStatusFilter(status: string) {
    this.selectedStatus = status;
    this.applyFilters();
  }

  applyFilters() {
    this.currentPage = 1;
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading = true;
    this.cdr.detectChanges();
    this.adminUsersService.getUsers(this.currentPage, this.limit, this.selectedRole, this.selectedStatus, this.searchQuery).subscribe({
      next: (res: any) => {
        // Backend already handles excluding admins, so we just use the data as is.
        let fetchedUsers = res.data || [];

        if (this.searchQuery) {
          const lowerQuery = this.searchQuery.toLowerCase();
          fetchedUsers = fetchedUsers.filter((u: any) => {
            const firstNameMatch = u.firstName && u.firstName.toLowerCase().startsWith(lowerQuery);
            const lastNameMatch = u.lastName && u.lastName.toLowerCase().startsWith(lowerQuery);
            const nameMatch = u.name && u.name.toLowerCase().startsWith(lowerQuery);
            const emailMatch = u.email && u.email.toLowerCase().startsWith(lowerQuery);
            return firstNameMatch || lastNameMatch || nameMatch || emailMatch;
          });
        }
        this.users = fetchedUsers;

        // Accurate total count: always fetch real student + instructor totals from backend
        if (this.selectedRole === 'student') {
          this.totalStudents = res.meta?.total || this.users.length;
          this.totalUsers = this.totalStudents;
          this.totalPages = res.meta?.totalPages || Math.ceil(this.totalUsers / this.limit) || 1;
          this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
          this.isLoading = false;
          this.cdr.detectChanges();
        } else if (this.selectedRole === 'instructor') {
          this.totalInstructors = res.meta?.total || this.users.length;
          this.totalUsers = this.totalInstructors;
          this.totalPages = res.meta?.totalPages || Math.ceil(this.totalUsers / this.limit) || 1;
          this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
          this.isLoading = false;
          this.cdr.detectChanges();
        } else {
          // All roles: fetch real totals from backend for each role separately
          forkJoin({
            students: this.adminUsersService.getUsers(1, 1, 'student', this.selectedStatus, this.searchQuery),
            instructors: this.adminUsersService.getUsers(1, 1, 'instructor', this.selectedStatus, this.searchQuery)
          }).subscribe(({ students, instructors }) => {
            this.totalStudents = students.meta?.total || 0;
            this.totalInstructors = instructors.meta?.total || 0;
            this.totalUsers = this.totalStudents + this.totalInstructors;
            this.totalPages = Math.ceil(this.totalUsers / this.limit) || 1;
            this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        }
      },
      error: (err) => {
        console.error('Failed to load users', err);
        this.isLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open('Failed to load users', 'Close', { duration: 3000 });
      }
    });
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadUsers();
    }
  }

  setPage(index: number) {
    if (index >= 0 && index < this.totalPages && index !== this.pageIndex) {
      this.currentPage = index + 1;
      this.loadUsers();
    }
  }

  setPageSize(size: number) {
    this.limit = size;
    this.currentPage = 1;
    this.loadUsers();
  }

  getUserAvatar(user: any): string | null {
    const avatar = user?.avatar?.trim();
    if (!avatar || avatar === 'null' || avatar === 'undefined' || avatar === '.....') {
      return null;
    }
    return avatar;
  }

  getUserInitials(user: any): string {
    const first = (user.firstName || '').trim();
    const last = (user.lastName || '').trim();
    if (first && last) return (first.charAt(0) + last.charAt(0)).toUpperCase();
    if (first) return first.charAt(0).toUpperCase();
    const parts = (user.name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return 'U';
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadUsers();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadUsers();
    }
  }

  blockUser(user: any) {
    this.blockTarget = user;
    this.blockReason = '';
    this.showBlockModal = true;
  }

  cancelBlock() {
    this.showBlockModal = false;
    this.blockTarget = null;
    this.blockReason = '';
    this.blockSuccess = false;
  }

  canBlock(user: any): boolean {
    return user.role !== 'admin' && user.role !== 'superadmin';
  }

  confirmBlock() {
    if (!this.blockReason.trim()) return;
    this.isBlocking = true;
    this.cdr.detectChanges();

    this.adminUsersService.blockUser(this.blockTarget.id, this.blockReason.trim())
      .pipe(finalize(() => { this.isBlocking = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: () => {
          const userName = `${this.blockTarget.firstName || ''} ${this.blockTarget.lastName || ''}`.trim() || this.blockTarget.name || 'User';
          this.blockTarget.status = 'blocked';
          this.showBlockModal = false;
          this.blockTarget = null;
          this.blockReason = '';
          this.loadUsers();
          this.toastr.success(`"${userName}" blocked successfully`);
        },
        error: (err) => {
          const errorMsg = err?.error?.message || 'Failed to block user';
          this.toastr.error(errorMsg, 'Error');
        }
      });
  }

  deactivateUser(user: any) {
    this.deactivateTarget = user;
    this.deactivateReason = '';
    this.showDeactivateModal = true;
  }

  cancelDeactivate() {
    this.showDeactivateModal = false;
    this.deactivateTarget = null;
    this.deactivateReason = '';
    this.deactivateSuccess = false;
  }

  confirmDeactivate() {
    if (!this.deactivateReason.trim()) return;
    this.isDeactivating = true;
    this.cdr.detectChanges();

    this.adminUsersService.deactivateUser(this.deactivateTarget.id, this.deactivateReason.trim())
      .pipe(finalize(() => { this.isDeactivating = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: () => {
          const userName = `${this.deactivateTarget.firstName || ''} ${this.deactivateTarget.lastName || ''}`.trim() || this.deactivateTarget.name || 'User';
          this.deactivateTarget.status = 'deactivated';
          this.showDeactivateModal = false;
          this.deactivateTarget = null;
          this.deactivateReason = '';
          this.loadUsers();
          this.toastr.success(`"${userName}" deactivated successfully`);
        },
        error: (err) => {
          const errorMsg = err?.error?.message || 'Failed to deactivate user';
          this.toastr.error(errorMsg, 'Error');
        }
      });
  }

  reactivateUser(user: any) {
    this.adminUsersService.reactivateUser(user.id).subscribe({
      next: () => {
        const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || 'User';
        user.status = 'active';
        this.toastr.success(`"${userName}" reactivated successfully`);
      },
      error: (err: any) => {
        const errorMsg = err?.error?.message || 'Failed to reactivate user';
        this.toastr.error(errorMsg, 'Error');
      }
    });
  }

  unblockUser(user: any) {
    this.adminUsersService.reactivateUser(user.id).subscribe({
      next: () => {
        const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || 'User';
        user.status = 'active';
        this.loadUsers();
        this.toastr.success(`"${userName}" has been unblocked`);
      },
      error: (err: any) => {
        const errorMsg = err?.error?.message || 'Failed to unblock user';
        this.toastr.error(errorMsg, 'Error');
      }
    });
  }

  exportUsers() {
    if (!this.users || this.users.length === 0) {
      this.snackBar.open('No users to export', 'Close', { duration: 3000, panelClass: ['bg-amber-600', 'text-white'] });
      return;
    }

    this.isExporting = true;

    const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Role', 'Status', 'Created At'];
    const rows = this.users.map(user => [
      user.id || '',
      user.firstName || '',
      user.lastName || '',
      user.email || '',
      user.role || '',
      user.status || '',
      user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''
    ].map(val => `"${val}"`).join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `edugenie_users_export_${dateStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    this.isExporting = false;
    this.snackBar.open('Export completed successfully', 'Close', { duration: 3000, panelClass: ['bg-green-600', 'text-white'] });
  }
}
