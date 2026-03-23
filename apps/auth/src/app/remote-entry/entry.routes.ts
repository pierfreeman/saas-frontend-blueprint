import { Route } from '@angular/router';
import { CallbackComponent } from './callback.component';
import { LoginComponent } from './login.component';

export const AUTH_ROUTES: Route[] = [
  { path: '', component: LoginComponent },
  { path: 'callback', component: CallbackComponent },
];
