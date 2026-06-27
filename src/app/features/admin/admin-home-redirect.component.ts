import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-admin-home-redirect',
    standalone: true,
    template: ``,
})
export class AdminHomeRedirectComponent implements OnInit {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    ngOnInit(): void {
        this.auth.waitForAuthInit().subscribe(() => {
            const user = this.auth.getCurrentUser();
            if (user?.role === 'superadmin') {
                void this.router.navigate(['/admin', 'command-center']);
            } else {
                void this.router.navigate(['/admin', 'course-approvals']);
            }
        });
    }
}
