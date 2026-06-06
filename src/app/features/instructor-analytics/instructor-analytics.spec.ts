import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstructorAnalyticsPageComponent } from './instructor-analytics.page';

describe('InstructorAnalyticsPageComponent', () => {
  let component: InstructorAnalyticsPageComponent;
  let fixture: ComponentFixture<InstructorAnalyticsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstructorAnalyticsPageComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(InstructorAnalyticsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
