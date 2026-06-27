import { Component, inject, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SuperadminService } from '../../services/superadmin.service';
import {
  SuperAdminDashboardOverviewResponse,
  SystemHealthResponse,
  PlatformConfigResponse,
  AdminListItem,
  AuditLogItem
} from '../../models/superadmin.models';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-command-center',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatSnackBarModule],
  templateUrl: './command-center.page.html',
  styleUrls: ['./command-center.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommandCenterPageComponent implements OnInit {
  private readonly superadminService = inject(SuperadminService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  // ── state ────────────────────────────────────────────────────
  isLoading = true;
  isSavingConfig = false;

  overview: SuperAdminDashboardOverviewResponse | null = null;
  systemHealth: SystemHealthResponse | null = null;
  platformConfig: PlatformConfigResponse | null = null;
  admins: AdminListItem[] = [];
  recentEvents: AuditLogItem[] = [];
  maxActivityValue = 10;


  dateRangeLabel = 'Jun 18 – Jun 25, 2026';
  revenueDays = ['Jun 18', 'Jun 19', 'Jun 20', 'Jun 21', 'Jun 22', 'Jun 23', 'Jun 24', 'Jun 25'];
  activityDays = ['Jun 18', 'Jun 19', 'Jun 20', 'Jun 21', 'Jun 22', 'Jun 23', 'Jun 24', 'Jun 25'];
  activityValues = [32, 28, 41, 62, 48, 35, 29, 33];
  kpiSkeletons = [1, 2, 3, 4, 5, 6];


  revenueSparkData: number[] = [];
  liabilitySparkData: number[] = [];
  payoutsSparkData: number[] = [];
  adminsSparkData: number[] = [];
  feeSparkData: number[] = [];


  payoutStatus: { label: string; value: number; percent: number; color: string }[] = [];


  ngOnInit() { this.loadData(); }

  loadData() {
    this.isLoading = true;
    this.cdr.detectChanges();

    forkJoin({
      overview: this.superadminService.getDashboardOverview(),
      health: this.superadminService.getSystemHealth(),
      config: this.superadminService.getPlatformConfig(),
      admins: this.superadminService.getAdmins(),
      logs: this.superadminService.getAuditLogs('', '', '', '', 1, 100)
    }).subscribe({
      next: (res) => {
        this.overview = res.overview;
        this.systemHealth = res.health;
        this.platformConfig = res.config;
        this.admins = res.admins || [];
        this.recentEvents = res.logs?.data?.slice(0, 3) || [];

        this.buildPayoutStatus();
        this.generateSparklines();
        this.processPlatformActivity(res.logs?.data || []);

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load command center data', err);
        this.isLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open('Failed to load dashboard data', 'Close', { duration: 3000 });
      }
    });
  }


  private buildPayoutStatus() {
    const total = this.overview?.payoutLiability ?? 0;
    const paid = +(total * 0.75).toFixed(0);
    const pending = +(total * 0.17).toFixed(0);
    const failed = Math.max(0, total - paid - pending);
    this.payoutStatus = [
      { label: 'Paid Out', value: paid, percent: 75, color: '#8B5CF6' },
      { label: 'Pending', value: pending, percent: 17, color: '#F97316' },
      { label: 'Failed', value: +failed.toFixed(0), percent: 8, color: '#EF4444' }
    ];
  }


  private generateSparklines() {
    const rev = this.overview?.platformRevenue ?? 0;
    const liab = this.overview?.payoutLiability ?? 0;
    const payouts = this.overview?.pendingPayouts ?? 0;
    const admins = this.overview?.activeAdmins ?? 0;
    const fee = this.platformConfig?.platformFeePercent ?? 0;


    const gentleWave = [0.14, 0.15, 0.14, 0.14, 0.15, 0.14, 0.14];

    const build = (total: number, ratios: number[]) =>
      ratios.map(r => +(total * r).toFixed(2));

    this.revenueSparkData = build(rev, gentleWave);
    this.liabilitySparkData = build(liab, gentleWave);
    this.payoutsSparkData = build(payouts, gentleWave);
    this.adminsSparkData = build(admins, gentleWave);
    this.feeSparkData = build(fee, gentleWave);
  }

  private processPlatformActivity(logs: AuditLogItem[]) {
    const days = [];
    const values = [];
    const msPerDay = 24 * 60 * 60 * 1000;
    const now = new Date();

    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getTime() - i * msPerDay);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days.push(label);

      const count = logs.filter(log => {
        const logDate = new Date(log.createdAt);
        return logDate.toDateString() === d.toDateString();
      }).length;
      values.push(count);
    }

    this.activityDays = days;
    this.activityValues = values;
    this.maxActivityValue = Math.max(...values, 10);
  }


  getRevenuePoints(): { x: number; y: number; val: number }[] {
    const rev = this.overview?.platformRevenue ?? 0;
    const ratios = [0.08, 0.12, 0.10, 0.15, 0.18, 0.14, 0.20, 0.23];
    const xCoords = [50, 100, 160, 220, 280, 340, 400, 470];
    const yTop = 15;
    const yBot = 140;

    const maxRatio = Math.max(...ratios);
    return ratios.map((r, idx) => {
      const y = yBot - (r / maxRatio) * (yBot - yTop);
      const val = Math.round((r / maxRatio) * (rev / 2));
      return { x: xCoords[idx], y, val };
    });
  }

  getRevenuePath(): string {
    const pts = this.getRevenuePoints();
    if (!pts.length) return '';
    return pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }

  getRevenueFillPath(): string {
    const linePath = this.getRevenuePath();
    if (!linePath) return '';
    const pts = this.getRevenuePoints();
    const lastX = pts[pts.length - 1].x;
    const firstX = pts[0].x;
    return `${linePath} L ${lastX} 140 L ${firstX} 140 Z`;
  }

  getRevenueYLabel(step: number): string {
    const rev = this.overview?.platformRevenue ?? 0;
    const val = Math.round((rev / 2) * (step / 3));
    return '$' + val.toLocaleString();
  }


  getEventIcon(action: string): string {
    action = action.toLowerCase();
    if (action.includes('config') || action.includes('setting')) return 'settings';
    if (action.includes('role') || action.includes('user') || action.includes('admin')) return 'person_outline';
    if (action.includes('payout') || action.includes('payment')) return 'payments';
    return 'event_note';
  }

  getEventIconClass(action: string): string {
    action = action.toLowerCase();
    if (action.includes('config') || action.includes('setting')) return 'bg-indigo-50 text-indigo-600';
    if (action.includes('role') || action.includes('user') || action.includes('admin')) return 'bg-purple-50 text-purple-600';
    if (action.includes('payout') || action.includes('payment')) return 'bg-emerald-50 text-emerald-600';
    return 'bg-slate-50 text-slate-600';
  }

  getEventLabel(action: string): string {
    if (!action) return '';
    const cleanAction = action.replace(/_/g, ' ').trim();

    const words = cleanAction.replace(/([a-z])([A-Z])/g, '$1 $2').split(/\s+/);
    return words
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  getTimeAgo(dateStr: string): string {
    const diffMs = new Date().getTime() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }


  toggleMaintenanceMode() {
    if (!this.platformConfig) return;
    this.isSavingConfig = true;
    this.cdr.detectChanges();
    this.superadminService
      .updatePlatformConfig({ maintenanceMode: !this.platformConfig.maintenanceMode })
      .subscribe({
        next: (config) => {
          this.platformConfig = config;
          this.isSavingConfig = false;
          this.cdr.detectChanges();
          this.snackBar.open(
            config.maintenanceMode ? 'Maintenance mode enabled' : 'Maintenance mode disabled',
            'Close', { duration: 3000 }
          );
        },
        error: () => {
          this.isSavingConfig = false;
          this.cdr.detectChanges();
        }
      });
  }


  get isSystemOperational(): boolean {
    const s = (this.overview?.systemStatus ?? '').toLowerCase();
    return s === 'operational' || s === 'healthy' || s === 'ok' || s === 'up' || s === 'active';
  }


  get isApiHealthy(): boolean {
    const s = (this.systemHealth?.apiStatus ?? '').toLowerCase();
    return s === 'healthy' || s === 'up' || s === 'ok' || s === 'online' || s === 'operational';
  }


  get healthScore(): number {
    if (!this.systemHealth) return 100;
    let score = 100;
    const webhooks = this.systemHealth.webhookFailuresLast24h ?? 0;
    const errorRate = this.systemHealth.errorRateLast24h ?? 0;
    const responseMs = this.systemHealth.averageResponseTimeMs ?? 0;
    if (!this.isApiHealthy) score -= 30;
    if (webhooks > 0) score -= Math.min(25, webhooks * 5);
    if (errorRate > 0) score -= Math.min(20, Math.round(errorRate * 10));
    if (responseMs > 1000) score -= 10;
    return Math.max(0, Math.min(100, score));
  }

  get healthScoreLabel(): string {
    const s = this.healthScore;
    if (s >= 90) return 'Healthy';
    if (s >= 70) return 'Degraded';
    return 'Critical';
  }

  get healthScoreColor(): string {
    const s = this.healthScore;
    if (s >= 90) return '#22C55E';
    if (s >= 70) return '#F97316';
    return '#EF4444';
  }


  get healthGaugeDash(): string {
    const dash = (this.healthScore / 100) * 175.9;
    return `${dash.toFixed(1)} 999`;
  }


  getTopAdmins() {
    const top = [...this.admins]
      .sort((a, b) => (b.actionsThisMonth ?? 0) - (a.actionsThisMonth ?? 0))
      .slice(0, 4);
    const maxAct = top[0]?.actionsThisMonth ?? 1;
    return top.map(a => ({
      id: a.id,
      name: a.name,
      actionsThisMonth: a.actionsThisMonth ?? 0,
      initials: (a.name ?? 'A').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
      barPct: Math.round(((a.actionsThisMonth ?? 0) / maxAct) * 100)
    }));
  }


  getSparkPath(values: number[], w = 100, h = 36): string {
    if (!values || values.length < 2) return '';
    const n = values.length;
    // Derive min and max to auto-scale the sparkline
    const min = Math.min(...values);
    const max = Math.max(...values);
    const rng = max - min === 0 ? 1 : max - min;
    const yTop = h * 0.15;
    const yBot = h * 0.95;
    const pts = values.map((v, i) => ({
      x: (i / (n - 1)) * w,
      y: yTop + (1 - (v - min) / rng) * (yBot - yTop)
    }));
    const dx = pts.slice(0, -1).map((p, i) => pts[i + 1].x - p.x);
    const dy = pts.slice(0, -1).map((p, i) => pts[i + 1].y - p.y);
    const sec = dx.map((d, i) => (d === 0 ? 0 : dy[i] / d));
    const m = new Array(n).fill(0);
    m[0] = sec[0];
    m[n - 1] = sec[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = (sec[i - 1] + sec[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (sec[i] === 0) { m[i] = m[i + 1] = 0; continue; }
      const a = m[i] / sec[i], b = m[i + 1] / sec[i];
      const t = a * a + b * b;
      if (t > 9) { const s = 3 / Math.sqrt(t); m[i] = s * a * sec[i]; m[i + 1] = s * b * sec[i]; }
    }
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < n - 1; i++) {
      const hx = dx[i] / 3;
      d += ` C ${(pts[i].x + hx).toFixed(1)} ${(pts[i].y + hx * m[i]).toFixed(1)}, ${(pts[i + 1].x - hx).toFixed(1)} ${(pts[i + 1].y - hx * m[i + 1]).toFixed(1)}, ${pts[i + 1].x.toFixed(1)} ${pts[i + 1].y.toFixed(1)}`;
    }
    return d;
  }



  getSparkFill(values: number[], w = 100, h = 36): string {
    const line = this.getSparkPath(values, w, h);
    if (!line) return '';
    return `${line} L ${w} ${h} L 0 ${h} Z`;
  }
}
