import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuizConfigPageComponent } from './quiz-config.page';

describe('QuizConfigPageComponent', () => {
  let component: QuizConfigPageComponent;
  let fixture: ComponentFixture<QuizConfigPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizConfigPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuizConfigPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
