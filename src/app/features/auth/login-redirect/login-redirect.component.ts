import { Component } from '@angular/core';
import { environment } from '../../../../environments/environment';

@Component({ standalone: true, template: '' })
export class LoginRedirectComponent {
  constructor() {
    window.location.href = `${environment.studentAppUrl}`;
  }
}
