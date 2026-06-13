import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-course-header',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './course-header.component.html',
  styleUrl: './course-header.component.css'
})
export class CourseHeaderComponent {
  @Input() draftStatus: 'draft' | 'published' = 'draft';
  @Input() hasUnsavedChanges = false;
  @Input() courseTitle: string | null = null;

}
