import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthDividerComponent } from './auth-divider.component';

describe('AuthDividerComponent', () => {
  let component: AuthDividerComponent;
  let fixture: ComponentFixture<AuthDividerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthDividerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AuthDividerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
