import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BackButtonComponent } from './back-button';
import { EventEmitter } from '@angular/core';

describe('BackButtonComponent', () => {
  let component: BackButtonComponent;
  let fixture: ComponentFixture<BackButtonComponent>;
  

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BackButtonComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(BackButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
