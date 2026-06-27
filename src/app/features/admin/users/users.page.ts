import { Component, inject, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminUsersService } from './services/admin-users.service';
import { UserRole } from '../../../core/models/user-profile.model';
import { Subject, Subscription, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { PageSkeletonComponent, ButtonLoadingComponent } from '../../../shared/components/loading';


@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatMenuModule, MatSnackBarModule, MatDividerModule, PageSkeletonComponent, ButtonLoadingComponent],
  templateUrl: './users.page.html',
  styleUrl: './users.page.css',
})
export class AdminUsersPageComponent implements OnInit, OnDestroy {
  private readonly adminUsersService = inject(AdminUsersService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  users: any[] = [];
  isLoading = true;
  totalUsers = 0;
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

  // Delete modal state
  showDeleteModal = false;
  deleteTarget: any = null;
  deleteReason = '';
  isDeleting = false;

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
    this.searchQuery = value; // Update instantly so the input field doesn't lag
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
        // Backend returns { data: [...], meta: { total, page, ... } }
        let fetchedUsers = res.data || [];

        // Exclude admin and superadmin users
        fetchedUsers = fetchedUsers.filter((u: any) => u.role !== 'admin' && u.role !== 'superadmin');

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

        // Accurate total count logic without modifying backend
        if (this.selectedRole) {
          this.totalUsers = res.meta?.total || this.users.length;
          this.totalPages = res.meta?.totalPages || Math.ceil(this.totalUsers / this.limit) || 1;
          this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
        } else {
          // If 'All Roles' is selected, fetch true totals for student + instructor only
          forkJoin({
            students: this.adminUsersService.getUsers(1, 1, 'student', this.selectedStatus, this.searchQuery),
            instructors: this.adminUsersService.getUsers(1, 1, 'instructor', this.selectedStatus, this.searchQuery)
          }).subscribe(({ students, instructors }) => {
            this.totalUsers = (students.meta?.total || 0) + (instructors.meta?.total || 0);
            this.totalPages = Math.ceil(this.totalUsers / this.limit) || 1;
            this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
            this.cdr.detectChanges();
          });
        }

        this.isLoading = false;
        this.cdr.detectChanges();
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

  getAvatarUrl(user: any): string {
    const avatar = user.avatar || user.profilePicture;
    if (!avatar) return '';
    if (avatar.startsWith('http')) return avatar;
    return `${environment.apiUrl}/${avatar.replace(/^\//, '')}`;
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
  }

  canBlock(user: any): boolean {
    return user.role !== 'admin' && user.role !== 'superadmin';
  }

  confirmBlock() {
    if (!this.blockReason.trim()) return;
    this.isBlocking = true;

    this.adminUsersService.deactivateUser(this.blockTarget.id, this.blockReason.trim()).subscribe({
      next: () => {
        this.blockTarget.status = 'deactivated';
        this.isBlocking = false;
        this.showBlockModal = false;
        this.blockTarget = null;
        this.blockReason = '';
        this.cdr.detectChanges();
        this.snackBar.open('User blocked successfully.', 'Close', { duration: 3000 });
      },
      error: (err) => {
        this.isBlocking = false;
        const errorMsg = err?.error?.message || 'Failed to block user';
        this.snackBar.open(errorMsg, 'Close', { duration: 3000 });
      }
    });
  }

  reactivateUser(user: any) {
    this.adminUsersService.reactivateUser(user.id).subscribe({
      next: () => {
        user.status = 'active';
        this.snackBar.open('User reactivated successfully', 'Close', { duration: 3000, panelClass: ['bg-green-600', 'text-white'] });
      },
      error: (err) => {
        const errorMsg = err?.error?.message || 'Failed to reactivate user';
        this.snackBar.open(errorMsg, 'Close', { duration: 3000, panelClass: ['bg-red-600', 'text-white'] });
      }
    });
  }

  // --- Delete User Logic ---
  deleteUser(user: any) {
    this.deleteTarget = user;
    this.deleteReason = '';
    this.showDeleteModal = true;
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.deleteTarget = null;
    this.deleteReason = '';
  }

  confirmDelete() {
    if (!this.deleteReason.trim()) return;
    this.isDeleting = true;

    setTimeout(() => {
      this.users = this.users.filter(u => u.id !== this.deleteTarget.id);
      this.totalUsers--;
      this.isDeleting = false;
      this.showDeleteModal = false;
      this.deleteTarget = null;
      this.deleteReason = '';
      this.snackBar.open('User deleted successfully (Simulated)', 'Close', { duration: 3000, panelClass: ['bg-green-600', 'text-white'] });
    }, 1000);
  }
}
