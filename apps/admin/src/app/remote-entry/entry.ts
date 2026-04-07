import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'app-admin-entry',
  template: `<router-outlet />`,
})
export class RemoteEntry {}

export { ADMIN_ROUTES } from './entry.routes';
