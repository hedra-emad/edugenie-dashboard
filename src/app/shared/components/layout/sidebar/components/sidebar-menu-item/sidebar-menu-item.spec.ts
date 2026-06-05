import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarMenuItem } from './sidebar-menu-item';

describe('SidebarMenuItem', () => {
  let component: SidebarMenuItem;
  let fixture: ComponentFixture<SidebarMenuItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarMenuItem]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidebarMenuItem);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
