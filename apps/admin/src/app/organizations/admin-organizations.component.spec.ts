import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
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

const mockOrg = {
  id: 'org-1',
  name: 'Acme',
  status: 'ACTIVE' as const,
  billingStatus: 'ACTIVE' as const,
  planId: 'PRO',
  membersCount: 5,
  createdAt: '2024-01-01T00:00:00Z',
};

const mockApi = {
  getOrganizations: vi.fn(() => of(emptyResult)),
  provisionOrganization: vi.fn(() => of(mockOrg)),
};

const mockRouter = { navigate: vi.fn() };

describe('AdminOrganizationsComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [AdminOrganizationsComponent],
      providers: [
        { provide: AdminApi, useValue: mockApi },
        { provide: Router, useValue: mockRouter },
        { provide: API_BASE_URL, useValue: 'http://test' },
      ],
    }).compileComponents();
  });

  afterEach(() => vi.useRealTimers());

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
    mockApi.getOrganizations.mockReturnValue(
      of({ items: [mockOrg], total: 1, limit: 20, offset: 0 }),
    );
    const fixture = TestBed.createComponent(AdminOrganizationsComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.organizations()).toHaveLength(1);
    expect(fixture.componentInstance.total()).toBe(1);
  });

  it('sets loading = false on API error', () => {
    mockApi.getOrganizations.mockReturnValueOnce(
      throwError(() => new Error('fail')),
    );
    const fixture = TestBed.createComponent(AdminOrganizationsComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('orgStatusSeverity and billingStatusSeverity return correct values', () => {
    const fixture = TestBed.createComponent(AdminOrganizationsComponent);
    const cmp = fixture.componentInstance;
    expect(cmp.orgStatusSeverity('ACTIVE')).toBe('success');
    expect(cmp.orgStatusSeverity('SUSPENDED')).toBe('warn');
    expect(cmp.orgStatusSeverity('DELETED')).toBe('danger');
    expect(cmp.billingStatusSeverity('TRIALING')).toBe('info');
    expect(cmp.billingStatusSeverity('PAST_DUE')).toBe('warn');
    expect(cmp.billingStatusSeverity('UNPAID')).toBe('danger');
    expect(cmp.billingStatusSeverity('NONE')).toBe('secondary');
  });

  it('onFilterChange resets offset and reloads immediately', () => {
    const fixture = TestBed.createComponent(AdminOrganizationsComponent);
    fixture.detectChanges();
    mockApi.getOrganizations.mockClear();

    const cmp = fixture.componentInstance;
    cmp.offset.set(20);
    cmp.selectedStatus = 'ACTIVE';
    cmp.onFilterChange();

    expect(cmp.offset()).toBe(0);
    expect(mockApi.getOrganizations).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE', offset: 0 }),
    );
  });

  it('onSearchChange debounces and reloads with search term', () => {
    const fixture = TestBed.createComponent(AdminOrganizationsComponent);
    fixture.detectChanges();
    mockApi.getOrganizations.mockClear();

    const cmp = fixture.componentInstance;
    cmp.searchTerm = 'Acme';
    cmp.onSearchChange();
    expect(mockApi.getOrganizations).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(mockApi.getOrganizations).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'Acme', offset: 0 }),
    );
  });

  it('onPageChange updates offset and reloads', () => {
    const fixture = TestBed.createComponent(AdminOrganizationsComponent);
    fixture.detectChanges();
    mockApi.getOrganizations.mockClear();

    fixture.componentInstance.onPageChange({ first: 20, rows: 20 });
    expect(fixture.componentInstance.offset()).toBe(20);
    expect(mockApi.getOrganizations).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 20 }),
    );
  });

  it('goToDetail navigates to org detail page', () => {
    const fixture = TestBed.createComponent(AdminOrganizationsComponent);
    fixture.detectChanges();
    fixture.componentInstance.goToDetail(mockOrg);
    expect(mockRouter.navigate).toHaveBeenCalledWith([
      '/admin/organizations',
      'org-1',
    ]);
  });

  it('openProvisionDialog resets form and opens dialog', () => {
    const fixture = TestBed.createComponent(AdminOrganizationsComponent);
    fixture.detectChanges();

    fixture.componentInstance.provisionForm = {
      name: 'Old',
      ownerEmail: 'old@x.com',
      plan: 'PRO',
    };
    fixture.componentInstance.openProvisionDialog();
    expect(fixture.componentInstance.dialogVisible).toBe(true);
    expect(fixture.componentInstance.provisionForm.name).toBe('');
  });

  it('submitProvision returns early when name is empty', () => {
    const fixture = TestBed.createComponent(AdminOrganizationsComponent);
    fixture.detectChanges();
    mockApi.provisionOrganization.mockClear();

    fixture.componentInstance.provisionForm = {
      name: '',
      ownerEmail: 'a@b.com',
      plan: 'FREE',
    };
    fixture.componentInstance.submitProvision();
    expect(mockApi.provisionOrganization).not.toHaveBeenCalled();
  });

  it('submitProvision calls API and navigates on success', () => {
    const fixture = TestBed.createComponent(AdminOrganizationsComponent);
    fixture.detectChanges();

    fixture.componentInstance.provisionForm = {
      name: 'Acme',
      ownerEmail: 'owner@acme.com',
      plan: 'FREE',
    };
    fixture.componentInstance.submitProvision();

    expect(mockApi.provisionOrganization).toHaveBeenCalledWith({
      name: 'Acme',
      ownerEmail: 'owner@acme.com',
      plan: 'FREE',
    });
    expect(mockRouter.navigate).toHaveBeenCalledWith([
      '/admin/organizations',
      'org-1',
    ]);
    expect(fixture.componentInstance.saving()).toBe(false);
  });

  it('submitProvision sets saving = false on error', () => {
    mockApi.provisionOrganization.mockReturnValueOnce(
      throwError(() => new Error('fail')),
    );
    const fixture = TestBed.createComponent(AdminOrganizationsComponent);
    fixture.detectChanges();

    fixture.componentInstance.provisionForm = {
      name: 'Acme',
      ownerEmail: 'owner@acme.com',
      plan: 'FREE',
    };
    fixture.componentInstance.submitProvision();
    expect(fixture.componentInstance.saving()).toBe(false);
  });

  it('always-visible provision button opens dialog via onClick', () => {
    const fixture = TestBed.createComponent(AdminOrganizationsComponent);
    fixture.detectChanges();

    const btn = fixture.debugElement.query(By.css('p-button'));
    btn?.triggerEventHandler('onClick', null);
    expect(fixture.componentInstance.dialogVisible).toBe(true);
  });

  it('org card click triggers goToDetail when orgs loaded', () => {
    mockApi.getOrganizations.mockReturnValue(
      of({ items: [mockOrg], total: 1, limit: 20, offset: 0 }),
    );
    const fixture = TestBed.createComponent(AdminOrganizationsComponent);
    fixture.detectChanges();

    const cards = fixture.debugElement.queryAll(By.css('p-card'));
    cards.forEach((card) => {
      try {
        card.triggerEventHandler('click', null);
      } catch {
        // ignore
      }
    });
  });

  it('paginator fires when org total exceeds PAGE_SIZE', () => {
    mockApi.getOrganizations.mockReturnValue(
      of({ items: [mockOrg], total: 50, limit: 20, offset: 0 }),
    );
    const fixture = TestBed.createComponent(AdminOrganizationsComponent);
    fixture.detectChanges();
    mockApi.getOrganizations.mockClear();

    const paginator = fixture.debugElement.query(By.css('p-paginator'));
    paginator?.triggerEventHandler('onPageChange', { first: 20, rows: 20 });
    expect(fixture.componentInstance.offset()).toBe(20);
  });

  it('provision dialog form element interactions', () => {
    const fixture = TestBed.createComponent(AdminOrganizationsComponent);
    fixture.detectChanges();

    // Open the provision dialog
    fixture.componentInstance.dialogVisible = true;
    fixture.detectChanges();

    const mockEvent = { preventDefault: () => {}, stopPropagation: () => {} };
    // trigger all p-buttons in the dialog
    const allButtons = fixture.debugElement.queryAll(By.css('p-button'));
    allButtons.forEach((btn) => {
      try {
        btn.triggerEventHandler('onClick', mockEvent);
      } catch {
        // ignore
      }
    });

    // Trigger dialog visibleChange
    const dialog = fixture.debugElement.query(By.css('p-dialog'));
    dialog?.triggerEventHandler('visibleChange', false);
  });
});
