import { Component, inject, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SuperadminService } from '../../services/superadmin.service';
import { SuperAdminDashboardOverviewResponse, SystemHealthResponse, PlatformConfigResponse } from '../../models/superadmin.models';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-command-center',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatSnackBarModule],
  templateUrl: './command-center.page.html',
  styleUrl: './command-center.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommandCenterPageComponent implements OnInit {
  private readonly superadminService = inject(SuperadminService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  isLoading = true;
  isSavingConfig = false;
  overview: SuperAdminDashboardOverviewResponse | null = null;
  systemHealth: SystemHealthResponse | null = null;
  platformConfig: PlatformConfigResponse | null = null;

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    this.cdr.detectChanges();

    forkJoin({
      overview: this.superadminService.getDashboardOverview(),
      health: this.superadminService.getSystemHealth(),
      config: this.superadminService.getPlatformConfig()
    }).subscribe({
      next: (res) => {
        this.overview = res.overview;
        this.systemHealth = res.health;
        this.platformConfig = res.config;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load command center data', err);
        this.isLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open('Failed to load command center data', 'Close', { duration: 3000 });
      }
    });
  }

  toggleMaintenanceMode() {
    if (!this.platformConfig) return;
    
    this.isSavingConfig = true;
    const newStatus = !this.platformConfig.maintenanceMode;
    this.cdr.detectChanges();

    this.superadminService.updatePlatformConfig({ maintenanceMode: newStatus }).subscribe({
      next: (config) => {
        this.platformConfig = config;
        this.isSavingConfig = false;
        this.cdr.detectChanges();
        const msg = config.maintenanceMode ? 'Maintenance mode enabled' : 'Maintenance mode disabled';
        this.snackBar.open(msg, 'Close', { duration: 3000, panelClass: ['bg-green-600', 'text-white'] });
      },
      error: (err) => {
        this.isSavingConfig = false;
        this.cdr.detectChanges();
        this.snackBar.open('Failed to update maintenance mode', 'Close', { duration: 3000, panelClass: ['bg-red-600', 'text-white'] });
      }
    });
  }
}
