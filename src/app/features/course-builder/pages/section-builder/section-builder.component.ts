import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { SectionCardComponent } from '../../components/section-card/section-card.component';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-section-builder',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    SectionCardComponent
  ],
  templateUrl: './section-builder.component.html',
  styleUrl: './section-builder.component.css'
})
export class SectionBuilderComponent {
  private fb = inject(FormBuilder);
  // @Input({ required: true }) sectionForm!: FormGroup;

  // @Input({ required: true }) sectionForm!: FormGroup;
  sectionForm = this.fb.group({
    sections: this.fb.array([])
  });

  @Input() courseId!: string;

  setSections(sections: any[]) {
    const arr = this.sectionForm.get('sections') as FormArray;
    arr.clear();

    sections.forEach(section => {
      arr.push(this.fb.group({
        title: section.title,
        description: section.description,
        isBasicSection: section.isBasicSection,
        expectedOutcomes: this.fb.array(
          (section.expectedOutcomes || []).map((x: any) => this.fb.control(x))
        ),
        lessons: this.fb.array([])
      }));
    });
  }

  // sectionsService = inject(SectionsService);

  get sectionsArray(): FormArray {
    return this.sectionForm.get('sections') as FormArray;
  }

  get sections(): FormGroup[] {
    return this.sectionsArray.controls as FormGroup[];
  }


  addSection() {
    const section = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      isBasicSection: [false],
      expectedOutcomes: this.fb.array([]),
      lessons: this.fb.array([])
    });
    this.sectionsArray.push(section);
    this.sectionsArray.markAsDirty();
  }

  deleteSection(index: number) {
    this.sectionsArray.removeAt(index);
    this.sectionsArray.markAsDirty();
  }

  moveSectionUp(index: number) {
    if (index === 0) return;
    const control = this.sectionsArray.at(index);
    this.sectionsArray.removeAt(index);
    this.sectionsArray.insert(index - 1, control);
    this.sectionsArray.markAsDirty();
  }

  moveSectionDown(index: number) {
    if (index === this.sectionsArray.length - 1) return;
    const control = this.sectionsArray.at(index);
    this.sectionsArray.removeAt(index);
    this.sectionsArray.insert(index + 1, control);
    this.sectionsArray.markAsDirty();
  }
}
