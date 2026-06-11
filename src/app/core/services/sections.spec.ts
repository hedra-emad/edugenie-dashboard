import { TestBed } from '@angular/core/testing';

import { Sections } from './sections';

describe('Sections', () => {
  let service: Sections;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Sections);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
