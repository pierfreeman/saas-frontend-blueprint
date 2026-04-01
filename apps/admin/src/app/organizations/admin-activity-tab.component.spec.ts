import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AdminActivityTabComponent } from './admin-activity-tab.component';
import { AdminApi } from '@saas-frontend/admin/data-access';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';

const mockApi = {
  getOrgActivity: vi.fn(() => of({ logs: [], total: 0, limit: 20, offset: 0 })),
};

describe('AdminActivityTabComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [AdminActivityTabComponent],
      providers: [
        { provide: AdminApi, useValue: mockApi },
        { provide: API_BASE_URL, useValue: 'http://test' },
      ],
    }).compileComponents();
  });

  it('loads activity on init', () => {
    const fixture = TestBed.createComponent(AdminActivityTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    expect(mockApi.getOrgActivity).toHaveBeenCalledWith('org-1', {
      limit: 20,
      offset: 0,
    });
  });
});
