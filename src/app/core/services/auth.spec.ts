import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { NotificationsService } from './notifications';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let notificationsService: jasmine.SpyObj<NotificationsService>;

  beforeEach(() => {
    const notificationsStub = jasmine.createSpyObj('NotificationsService', ['connectPusher', 'disconnectPusher']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NotificationsService, useValue: notificationsStub },
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    notificationsService = TestBed.inject(NotificationsService) as jasmine.SpyObj<NotificationsService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should reject login when the account is deactivated or deleted', () => {
    service.login({ email: 'deleted@example.com', password: 'password123' }).subscribe({
      next: () => fail('Expected login to fail for a deleted account'),
      error: (error) => {
        expect(error.message).toContain('deactivated');
        expect(service.getCurrentUser()).toBeNull();
      },
    });

    const req = httpMock.expectOne('/auth/login');
    expect(req.request.method).toBe('POST');

    req.flush({
      success: true,
      data: {
        message: 'ok',
        user: {
          id: '1',
          firstName: 'Deleted',
          lastName: 'User',
          email: 'deleted@example.com',
          role: 'student',
          status: 'deactivated',
        },
      },
    });
  });
});
