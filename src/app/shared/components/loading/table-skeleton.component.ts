import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-table-skeleton',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="table-skeleton-container" [ngClass]="customClass">
      <table class="w-full text-left border-collapse">
        <thead *ngIf="showHeader" class="bg-[#f9fafb] border-b border-slate-200">
          <tr>
            <th *ngFor="let col of colArray; let first = first" class="px-6 py-4">
              <div class="shimmer header-cell" [style.width]="first && showAvatarCol ? '120px' : '80px'"></div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of rowArray" class="border-b border-slate-100 bg-white">
            <td *ngFor="let col of colArray; let first = first" class="px-6 py-4 align-middle">
              <div class="flex items-center gap-3" *ngIf="first && showAvatarCol; else standardCell">
                <!-- Avatar circle + line group -->
                <div class="shimmer avatar-placeholder"></div>
                <div class="flex flex-col gap-2 w-28">
                  <div class="shimmer cell-line w-full"></div>
                  <div class="shimmer cell-subline w-2/3"></div>
                </div>
              </div>
              <ng-template #standardCell>
                <div class="shimmer cell-line" [style.width]="getRandomWidth(col)"></div>
              </ng-template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .table-skeleton-container {
      width: 100%;
      overflow-x: auto;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }
    .w-full { width: 100%; }
    .shimmer {
      background: linear-gradient(90deg, #F5F3FF 25%, #EDE9FE 50%, #F5F3FF 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite linear;
      border-radius: 6px;
    }
    .header-cell {
      height: 14px;
    }
    .avatar-placeholder {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .cell-line {
      height: 12px;
      border-radius: 4px;
    }
    .cell-subline {
      height: 8px;
      border-radius: 3px;
    }
    .w-2/3 { width: 66.667%; }
    @keyframes shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }
  `]
})
export class TableSkeletonComponent {
  @Input() cols: number = 5;
  @Input() rows: number = 5;
  @Input() showHeader: boolean = true;
  @Input() showAvatarCol: boolean = true;
  @Input() customClass: string = '';

  get colArray(): number[] {
    return Array(this.cols).fill(0);
  }

  get rowArray(): number[] {
    return Array(this.rows).fill(0);
  }

  getRandomWidth(index: number): string {
    const widths = ['70%', '50%', '85%', '60%', '40%'];
    return widths[index % widths.length];
  }
}
