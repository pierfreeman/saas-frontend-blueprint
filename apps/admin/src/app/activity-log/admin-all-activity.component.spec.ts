import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AdminAllActivityComponent } from './admin-all-activity.component';
import { AdminApi } from '@saas-frontend/admin/data-access';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';

const mockApi = {
  getAllActivity: vi.fn(() => of({ logs: [], total: 0, limit: 30, offset: 0 })),
};

describe('AdminAllActivityComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [AdminAllActivityComponent],
      providers: [
        { provide: AdminApi, useValue: mockApi },
        { provide: API_BASE_URL, useValue: 'http://test' },
      ],
    }).compileComponents();
  });

  it('loads all activity on init', () => {
    const fixture = TestBed.createComponent(AdminAllActivityComponent);
    fixture.detectChanges();
    expect(mockApi.getAllActivity).toHaveBeenCalledWith({
      limit: 30,
      offset: 0,
    });
  });
});
