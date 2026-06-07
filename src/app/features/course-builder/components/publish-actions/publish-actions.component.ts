import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-publish-actions',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './publish-actions.component.html',
  styleUrl: './publish-actions.component.css'
})
export class PublishActionsComponent {
  @Input() draftStatus: 'Draft' | 'Published' = 'Draft';
  @Input() hasUnsavedChanges = false;
  @Input() isValid = false;
  @Input() isSaving = false;

  @Output() saveDraft = new EventEmitter<void>();
  @Output() publishCourse = new EventEmitter<void>();
}
