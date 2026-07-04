import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { CloudinaryDraftCleanupService } from './cloudinary-draft-cleanup.service.ts';

describe('CloudinaryDraftCleanupService', () => {
  let service: CloudinaryDraftCleanupService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CloudinaryDraftCleanupService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
