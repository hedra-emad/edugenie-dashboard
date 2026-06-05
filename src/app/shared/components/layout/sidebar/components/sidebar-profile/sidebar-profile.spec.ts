import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarProfile } from './sidebar-profile';

describe('SidebarProfile', () => {
  let component: SidebarProfile;
  let fixture: ComponentFixture<SidebarProfile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarProfile]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidebarProfile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
