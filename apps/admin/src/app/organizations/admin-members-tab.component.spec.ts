import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AdminMembersTabComponent } from './admin-members-tab.component';
import { AdminApi } from '@saas-frontend/admin/data-access';
import { API_BASE_URL } from '@saas-frontend/shared/util-types';
import { MessageService, ConfirmationService } from 'primeng/api';

const mockApi = {
  listMembers: vi.fn(() => of({ items: [], total: 0, limit: 20, offset: 0 })),
  inviteMember: vi.fn(() => of(undefined)),
  changeRole: vi.fn(() => of({})),
  removeMember: vi.fn(() => of(undefined)),
};

describe('AdminMembersTabComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [AdminMembersTabComponent],
      providers: [
        { provide: AdminApi, useValue: mockApi },
        { provide: API_BASE_URL, useValue: 'http://test' },
        MessageService,
        ConfirmationService,
      ],
    }).compileComponents();
  });

  it('loads members on init', () => {
    const fixture = TestBed.createComponent(AdminMembersTabComponent);
    fixture.componentInstance.orgId = 'org-1';
    fixture.detectChanges();
    expect(mockApi.listMembers).toHaveBeenCalledWith('org-1', {
      limit: 20,
      offset: 0,
    });
  });

  it('memberInitials uses first+last name', () => {
    const fixture = TestBed.createComponent(AdminMembersTabComponent);
    const cmp = fixture.componentInstance;
    cmp.orgId = 'org-1';
    const member = {
      id: 'm-1',
      orgId: 'org-1',
      userId: 'u-1',
      role: 'MEMBER' as const,
      status: 'ACTIVE' as const,
      createdAt: '',
      user: {
        id: 'u-1',
        email: 'a@b.com',
        firstName: 'Jane',
        lastName: 'Doe',
        pictureUrl: null,
      },
    };
    expect(cmp.memberInitials(member)).toBe('JD');
  });
});
