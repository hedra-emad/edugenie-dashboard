import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-upload-status',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './upload-status.component.html',
  styleUrl: './upload-status.component.css'
})
export class UploadStatusComponent {
  @Input() status: 'idle' | 'uploading' | 'success' | 'error' | 'videoTooLong' = 'idle';
  @Input() progress: number = 0;
  @Input() fileName: string | null = null;
}
