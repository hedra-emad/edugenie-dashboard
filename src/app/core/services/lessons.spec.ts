import { TestBed } from '@angular/core/testing';

import { Lessons } from './lessons';

describe('Lessons', () => {
  let service: Lessons;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Lessons);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
