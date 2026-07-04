import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideToastr } from 'ngx-toastr';

import { PublishCourseButtonComponent } from './publish-course-button';

describe('PublishCourseButtonComponent', () => {
  let component: PublishCourseButtonComponent;
  let fixture: ComponentFixture<PublishCourseButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublishCourseButtonComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideToastr(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PublishCourseButtonComponent);
    component = fixture.componentInstance;
    // courseId is a required input — set it before the first change detection.
    fixture.componentRef.setInput('courseId', 'test-course-id');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
