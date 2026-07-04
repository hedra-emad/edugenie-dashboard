import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { CloudinaryService } from './cloudinary';

describe('CloudinaryService', () => {
  let service: CloudinaryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CloudinaryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
