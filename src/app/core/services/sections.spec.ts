import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { SectionsService } from './sections';

describe('SectionsService', () => {
  let service: SectionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SectionsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
