import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AdminOrganizationsComponent } from './admin-organizations.component';
import {
  AdminApi,
  type PaginatedAdminOrganizationsResult,
} from '@saas-frontend/admin/data-access';
import { Router } from '@angular/router';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';

const emptyResult: PaginatedAdminOrganizationsResult = {
  items: [],
  total: 0,
  limit: 20,
  offset: 0,
};

const mockApi = {
  getOrganizations: vi.fn(() => of(emptyResult)),
};

describe('AdminOrganizationsComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [AdminOrganizationsComponent],
      providers: [
        { provide: AdminApi, useValue: mockApi },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: API_BASE_URL, useValue: 'http://test' },
      ],
    }).compileComponents();
  });

  it('loads organizations on init', () => {
    const fixture = TestBed.createComponent(AdminOrganizationsComponent);
    fixture.detectChanges();
    expect(mockApi.getOrganizations).toHaveBeenCalledWith({
      search: undefined,
      status: undefined,
      limit: 20,
      offset: 0,
    });
  });

  it('sets organizations signal from API response', () => {
    const mockOrg = {
      id: 'org-1',
      name: 'Acme',
      status: 'ACTIVE' as const,
      billingStatus: 'ACTIVE' as const,
      planId: 'PRO',
      membersCount: 5,
      createdAt: '2024-01-01T00:00:00Z',
    };
    mockApi.getOrganizations.mockReturnValue(
      of({ items: [mockOrg], total: 1, limit: 20, offset: 0 }),
    );
    const fixture = TestBed.createComponent(AdminOrganizationsComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.organizations()).toHaveLength(1);
    expect(fixture.componentInstance.total()).toBe(1);
  });
});
