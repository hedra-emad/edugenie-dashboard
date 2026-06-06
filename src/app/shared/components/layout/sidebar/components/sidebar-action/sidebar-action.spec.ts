import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgIf } from '@angular/common';

import { SidebarAction } from './sidebar-action';

describe('SidebarAction', () => {
  let component: SidebarAction;
  let fixture: ComponentFixture<SidebarAction>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarAction]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidebarAction);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
