import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAuth0 } from '@auth0/auth0-angular';
import { appRoutes } from './app.routes';
import { environment } from 'src/environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideAuth0({
      domain: environment.auth0Domain,
      clientId: environment.auth0ClientId,
      useRefreshTokens: true,
      cacheLocation: 'localstorage',
      authorizationParams: {
        audience: environment.auth0Audience,
        redirect_uri: environment.auth0RedirectUri,
      },
    }),
  ],
};
