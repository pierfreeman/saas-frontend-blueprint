import { getTestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';

console.log('[test-setup] RUNNING');

const ANGULAR_TESTBED_SETUP = Symbol.for('@angular/cli/testbed-setup');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (!(globalThis as any)[ANGULAR_TESTBED_SETUP]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any)[ANGULAR_TESTBED_SETUP] = true;
  console.log('[test-setup] calling initTestEnvironment');
  getTestBed().initTestEnvironment(
    BrowserTestingModule,
    platformBrowserTesting(),
  );
  console.log('[test-setup] initTestEnvironment done');
}
