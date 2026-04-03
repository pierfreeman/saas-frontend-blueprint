import {
  getTestBed,
  ɵgetCleanupHook as getCleanupHook,
} from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { beforeEach, afterEach } from 'vitest';

// jsdom does not implement ResizeObserver; stub it for PrimeNG components that use it.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    observe() {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    unobserve() {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    disconnect() {}
  };
}

beforeEach(getCleanupHook(false));
afterEach(getCleanupHook(true));

const ANGULAR_TESTBED_SETUP = Symbol.for('@angular/cli/testbed-setup');
if (!globalThis[ANGULAR_TESTBED_SETUP]) {
  globalThis[ANGULAR_TESTBED_SETUP] = true;
  getTestBed().initTestEnvironment(
    BrowserTestingModule,
    platformBrowserTesting(),
    {
      errorOnUnknownElements: true,
      errorOnUnknownProperties: true,
    },
  );
}
