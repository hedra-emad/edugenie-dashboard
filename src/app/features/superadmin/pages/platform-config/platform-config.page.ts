import { Component, inject, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SuperadminService } from '../../services/superadmin.service';
import { PlatformConfigResponse } from '../../models/superadmin.models';

@Component({
  selector: 'app-platform-config',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatSnackBarModule],
  templateUrl: './platform-config.page.html',
  styleUrl: './platform-config.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlatformConfigPageComponent implements OnInit {
  private readonly superadminService = inject(SuperadminService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  isLoading = true;
  originalConfig: PlatformConfigResponse | null = null;
  formConfig: Partial<PlatformConfigResponse> = {
    platformFeePercent: undefined,
    instructorSharePercent: undefined,
    maintenanceMode: false,
    minimumPayoutThreshold: undefined
  };

  hasInput = false;

  showConfirmModal = false;
  isSaving = false;

  ngOnInit() {
    this.loadConfig();
  }

  loadConfig() {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.superadminService.getPlatformConfig().subscribe({
      next: (config) => {
        this.originalConfig = config;
        this.formConfig = { 
          platformFeePercent: undefined,
          instructorSharePercent: undefined,
          minimumPayoutThreshold: undefined,
          maintenanceMode: config.maintenanceMode 
        };
        this.hasInput = false;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load platform config', err);
        this.isLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open('Failed to load platform configuration', 'Close', { duration: 3000 });
      }
    });
  }

  get isDirty(): boolean {
    if (!this.hasInput) return false;
    const hasFee = this.formConfig.platformFeePercent !== null &&
      this.formConfig.platformFeePercent !== undefined &&
      String(this.formConfig.platformFeePercent).trim() !== '';
    const hasThreshold = this.formConfig.minimumPayoutThreshold !== null &&
      this.formConfig.minimumPayoutThreshold !== undefined &&
      String(this.formConfig.minimumPayoutThreshold).trim() !== '';
    const maintenanceChanged = this.originalConfig ? this.formConfig.maintenanceMode !== this.originalConfig.maintenanceMode : false;
    
    return hasFee || hasThreshold || maintenanceChanged;
  }

  onFieldInput() {
    this.hasInput = true;
    this.cdr.detectChanges();
  }

  toggleMaintenanceMode() {
    this.formConfig.maintenanceMode = !this.formConfig.maintenanceMode;
    this.hasInput = true;
    this.cdr.detectChanges();
  }

  openConfirmModal() {
    if (!this.isDirty) return;
    this.showConfirmModal = true;
  }

  closeConfirmModal() {
    if (this.isSaving) return;
    this.showConfirmModal = false;
  }

  saveConfig() {
    this.isSaving = true;
    this.cdr.detectChanges();

    this.superadminService.updatePlatformConfig(this.formConfig).subscribe({
      next: (config) => {
        this.originalConfig = config;
        this.formConfig = { 
          platformFeePercent: undefined,
          instructorSharePercent: undefined,
          minimumPayoutThreshold: undefined,
          maintenanceMode: config.maintenanceMode 
        };
        this.hasInput = false;
        this.isSaving = false;
        this.showConfirmModal = false;
        this.cdr.detectChanges();
        this.snackBar.open('Platform configuration updated successfully.', 'Close', { duration: 3000, panelClass: ['bg-green-600', 'text-white'] });
      },
      error: (err) => {
        this.isSaving = false;
        this.cdr.detectChanges();
        const errorMsg = err?.error?.message || 'Failed to update configuration';
        this.snackBar.open(errorMsg, 'Close', { duration: 3000, panelClass: ['bg-red-600', 'text-white'] });
      }
    });
  }
}
