import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublishCourseButton } from './publish-course-button';

describe('PublishCourseButton', () => {
  let component: PublishCourseButton;
  let fixture: ComponentFixture<PublishCourseButton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublishCourseButton]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PublishCourseButton);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
