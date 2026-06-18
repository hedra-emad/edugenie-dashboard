import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LessonBuilder } from './lesson-builder';

describe('LessonBuilder', () => {
  let component: LessonBuilder;
  let fixture: ComponentFixture<LessonBuilder>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LessonBuilder]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LessonBuilder);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
