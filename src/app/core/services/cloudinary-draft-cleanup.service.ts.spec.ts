import { TestBed } from '@angular/core/testing';

import { CloudinaryDraftCleanupServiceTs } from './cloudinary-draft-cleanup.service.ts';

describe('CloudinaryDraftCleanupServiceTs', () => {
  let service: CloudinaryDraftCleanupServiceTs;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CloudinaryDraftCleanupServiceTs);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
