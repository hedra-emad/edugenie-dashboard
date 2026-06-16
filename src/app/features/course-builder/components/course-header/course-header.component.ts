import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { BadgeComponent } from '../../../../shared/components/badge-component/badge-component';
import { CourseStatus } from '../../../../core/enums/course-status';
@Component({
  selector: 'app-course-header',
  standalone: true,
  imports: [CommonModule, MatIconModule, BadgeComponent],
  templateUrl: './course-header.component.html',
  styleUrl: './course-header.component.css'
})
export class CourseHeaderComponent {
  @Input() courseStatus: CourseStatus = CourseStatus.DRAFT;
  @Input() hasUnsavedChanges = false;
  @Input() courseTitle: string | null = null;
  @Input() courseId: string | null = null;
}
