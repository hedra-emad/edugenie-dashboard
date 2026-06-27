import { Component } from '@angular/core';
import { environment } from '../../../../environments/enviroment';

@Component({ standalone: true, template: '' })
export class LoginRedirectComponent {
  constructor() {
    window.location.href = `${environment.studentAppUrl}`;
  }
}
