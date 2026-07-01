import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, timer } from 'rxjs';
import { map } from 'rxjs/operators';
import { AdminUsersPageComponent } from './users.page';
import { AdminUsersService } from './services/admin-users.service';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('AdminUsersPageComponent', () => {
    let component: AdminUsersPageComponent;
    let fixture: ComponentFixture<AdminUsersPageComponent>;
    let adminUsersService: jasmine.SpyObj<AdminUsersService>;

    beforeEach(async () => {
        const adminUsersServiceSpy = jasmine.createSpyObj('AdminUsersService', ['deleteUser']);
        adminUsersServiceSpy.deleteUser.and.returnValue(
            timer(1000).pipe(map(() => ({ success: true })))
        );

        await TestBed.configureTestingModule({
            imports: [AdminUsersPageComponent],
            providers: [
                { provide: AdminUsersService, useValue: adminUsersServiceSpy },
                { provide: MatSnackBar, useValue: { open: jasmine.createSpy('open') } },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();

        fixture = TestBed.createComponent(AdminUsersPageComponent);
        component = fixture.componentInstance;
        adminUsersService = TestBed.inject(AdminUsersService) as jasmine.SpyObj<AdminUsersService>;
    });

    it('should stop the delete loading state immediately and remove the user optimistically', () => {
        component.users = [
            { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', role: 'student', status: 'active' },
        ];
        component.totalUsers = 1;
        component.deleteTarget = component.users[0];
        component.deleteReason = 'test reason';

        component.confirmDelete();

        expect(component.isDeleting).toBeFalse();
        expect(component.users.length).toBe(0);
        expect(component.totalUsers).toBe(0);
        expect(component.showDeleteModal).toBeFalse();
        expect(adminUsersService.deleteUser).toHaveBeenCalled();
    });
});
