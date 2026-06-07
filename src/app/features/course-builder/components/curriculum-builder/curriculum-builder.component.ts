import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { SectionCardComponent } from '../section-card/section-card.component';

@Component({
  selector: 'app-curriculum-builder',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    SectionCardComponent
  ],
  templateUrl: './curriculum-builder.component.html',
  styleUrl: './curriculum-builder.component.css'
})
export class CurriculumBuilderComponent {
  private fb = inject(FormBuilder);
  @Input({ required: true }) parentForm!: FormGroup;

  get sectionsArray(): FormArray {
    return this.parentForm.get('sections') as FormArray;
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
