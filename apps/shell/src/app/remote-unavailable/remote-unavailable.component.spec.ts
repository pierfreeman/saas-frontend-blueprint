import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { RemoteUnavailableComponent } from './remote-unavailable.component';

describe('RemoteUnavailableComponent', () => {
  function setup(routeData: Record<string, unknown> = {}) {
    TestBed.configureTestingModule({
      imports: [RemoteUnavailableComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: routeData } },
        },
      ],
    });

    const fixture = TestBed.createComponent(RemoteUnavailableComponent);
    return fixture.componentInstance;
  }

  it('reads remoteName from route data', () => {
    const comp = setup({ remoteName: 'auth' });
    expect(comp.remoteName).toBe('auth');
  });

  it('defaults remoteName to "requested" when route data is empty', () => {
    const comp = setup({});
    expect(comp.remoteName).toBe('requested');
  });

  it('reload() calls window.location.reload', () => {
    const comp = setup({ remoteName: 'platform' });
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadSpy },
      writable: true,
      configurable: true,
    });

    comp.reload();

    expect(reloadSpy).toHaveBeenCalledOnce();
  });
});
