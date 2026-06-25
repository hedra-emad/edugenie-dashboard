import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-admin-dashboard-placeholder',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="p-6 max-w-4xl mx-auto">
      <div class="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center">
        <div class="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-6">
          <mat-icon class="scale-125">grid_view</mat-icon>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Overview & Insights</h1>
        <p class="text-gray-500 max-w-md mb-6">
          Monitor course signups, instructor applications, user growth, and transactional activity in real-time.
        </p>
        <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold">
          <span class="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
          Scheduled for Phase 2 Implementation
        </span>
      </div>
    </div>
  `
})
export class AdminDashboardComponent {}

@Component({
  selector: 'app-admin-users-placeholder',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="p-6 max-w-4xl mx-auto">
      <div class="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center">
        <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
          <mat-icon class="scale-125">group</mat-icon>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-2">User Management</h1>
        <p class="text-gray-500 max-w-md mb-6">
          Administer student enrollments, instructor credentials, active sessions, and access permissions.
        </p>
        <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
          <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          Scheduled for Phase 2 Implementation
        </span>
      </div>
    </div>
  `
})
export class AdminUsersComponent {}

@Component({
  selector: 'app-admin-categories-placeholder',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="p-6 max-w-4xl mx-auto">
      <div class="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center">
        <div class="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6">
          <mat-icon class="scale-125">category</mat-icon>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Category Configurations</h1>
        <p class="text-gray-500 max-w-md mb-6">
          Define global classification categories for all online courses. Reordering and management is available in Course Approvals page side panel.
        </p>
        <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Scheduled for Phase 2 Implementation
        </span>
      </div>
    </div>
  `
})
export class AdminCategoriesComponent {}

@Component({
  selector: 'app-admin-reports-placeholder',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="p-6 max-w-4xl mx-auto">
      <div class="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center">
        <div class="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-6">
          <mat-icon class="scale-125">bar_chart</mat-icon>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
        <p class="text-gray-500 max-w-md mb-6">
          Generate custom CSV exports for course completions, financial receipts, instructor commissions, and platform metrics.
        </p>
        <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold">
          <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          Scheduled for Phase 2 Implementation
        </span>
      </div>
    </div>
  `
})
export class AdminReportsComponent {}

@Component({
  selector: 'app-admin-support-placeholder',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="p-6 max-w-4xl mx-auto">
      <div class="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center">
        <div class="w-16 h-16 bg-cyan-50 text-cyan-600 rounded-full flex items-center justify-center mb-6">
          <mat-icon class="scale-125">help_outline</mat-icon>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Support Center</h1>
        <p class="text-gray-500 max-w-md mb-6">
          Access customer service queries, instructor helpdesk tickets, refund requests, and user disputes.
        </p>
        <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-50 text-cyan-700 text-xs font-semibold">
          <span class="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
          Scheduled for Phase 2 Implementation
        </span>
      </div>
    </div>
  `
})
export class AdminSupportComponent {}

@Component({
  selector: 'app-admin-settings-placeholder',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="p-6 max-w-4xl mx-auto">
      <div class="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center">
        <div class="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mb-6">
          <mat-icon class="scale-125">settings</mat-icon>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Platform Settings</h1>
        <p class="text-gray-500 max-w-md mb-6">
          Configure site metadata, email SMTP details, payment gateway APIs, and media hosting rules.
        </p>
        <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold">
          <span class="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
          Scheduled for Phase 2 Implementation
        </span>
      </div>
    </div>
  `
})
export class AdminSettingsComponent {}
