import { describe, it, expect, beforeEach } from 'vitest';
import { SimpleChange, SimpleChanges } from '@angular/core';
import { PlanningDetailDialogComponent } from './planning-detail-dialog.component';
import type { MembershipSummary } from '@saas-frontend/memberships/data-access';

type DialogAny = {
  memberMap: Map<string, MembershipSummary>;
  memberDisplayName(userId: string): string;
  formatReminder(minutes: number): string;
  memberInitials(userId: string): string;
  rsvpSeverity(status: string): 'success' | 'warn' | 'danger' | 'secondary';
} & PlanningDetailDialogComponent;

function makeMember(
  overrides: Partial<MembershipSummary> = {},
): MembershipSummary {
  return {
    userId: 'user-1',
    orgId: 'org-1',
    role: 'MEMBER',
    user: {
      id: 'user-1',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
      pictureUrl: null,
    },
    ...overrides,
  } as unknown as MembershipSummary;
}

function makeChanges(key: string, prev: unknown, curr: unknown): SimpleChanges {
  return {
    [key]: new SimpleChange(prev, curr, prev === null),
  } as SimpleChanges;
}

describe('PlanningDetailDialogComponent', () => {
  let comp: DialogAny;

  beforeEach(() => {
    comp = new PlanningDetailDialogComponent() as unknown as DialogAny;
  });

  // ── ngOnChanges / memberMap ────────────────────────────────────────────────

  describe('ngOnChanges()', () => {
    it('builds memberMap keyed by userId', () => {
      comp.members = [
        makeMember({ userId: 'user-1' }),
        makeMember({ userId: 'user-2' }),
      ];
      comp.ngOnChanges(makeChanges('members', [], comp.members));

      expect(comp.memberMap.size).toBe(2);
      expect(comp.memberMap.has('user-1')).toBe(true);
      expect(comp.memberMap.has('user-2')).toBe(true);
    });

    it('clears the memberMap when members becomes empty', () => {
      comp.members = [makeMember()];
      comp.ngOnChanges(makeChanges('members', [], comp.members));
      comp.members = [];
      comp.ngOnChanges(makeChanges('members', [makeMember()], []));

      expect(comp.memberMap.size).toBe(0);
    });
  });

  // ── memberDisplayName ──────────────────────────────────────────────────────

  describe('memberDisplayName()', () => {
    beforeEach(() => {
      comp.members = [makeMember({ userId: 'user-1' })];
      comp.ngOnChanges(makeChanges('members', [], comp.members));
    });

    it('returns "First Last" when both names are set', () => {
      expect(comp.memberDisplayName('user-1')).toBe('Alice Smith');
    });

    it('returns userId when the member is not in the map', () => {
      expect(comp.memberDisplayName('unknown-id')).toBe('unknown-id');
    });

    it('falls back to email when first and last name are empty', () => {
      comp.members = [
        makeMember({
          userId: 'user-2',
          user: {
            id: 'u2',
            firstName: '',
            lastName: '',
            email: 'bob@example.com',
            pictureUrl: null,
          } as never,
        }),
      ];
      comp.ngOnChanges(makeChanges('members', [], comp.members));

      expect(comp.memberDisplayName('user-2')).toBe('bob@example.com');
    });

    it('falls back to userId when user has no name or email', () => {
      comp.members = [
        makeMember({
          userId: 'user-3',
          user: {
            id: 'u3',
            firstName: '',
            lastName: '',
            email: '',
            pictureUrl: null,
          } as never,
        }),
      ];
      comp.ngOnChanges(makeChanges('members', [], comp.members));

      expect(comp.memberDisplayName('user-3')).toBe('user-3');
    });
  });

  // ── formatReminder ─────────────────────────────────────────────────────────

  describe('formatReminder()', () => {
    it('formats values less than 60 minutes', () => {
      expect(comp.formatReminder(15)).toBe('15 minutes before');
      expect(comp.formatReminder(30)).toBe('30 minutes before');
    });

    it('formats exactly 60 minutes as "1 hour before"', () => {
      expect(comp.formatReminder(60)).toBe('1 hour before');
    });

    it('formats values between 61 and 1439 minutes as hours', () => {
      expect(comp.formatReminder(120)).toBe('2 hours before');
      expect(comp.formatReminder(180)).toBe('3 hours before');
    });

    it('formats 1440 minutes (one full day) as "1 day before"', () => {
      expect(comp.formatReminder(1440)).toBe('1 day before');
    });
  });

  // ── memberInitials ─────────────────────────────────────────────────────────

  describe('memberInitials()', () => {
    beforeEach(() => {
      comp.members = [makeMember({ userId: 'user-1' })];
      comp.ngOnChanges(makeChanges('members', [], comp.members));
    });

    it('returns "AS" for Alice Smith', () => {
      expect(comp.memberInitials('user-1')).toBe('AS');
    });

    it('returns "?" for an unknown userId', () => {
      expect(comp.memberInitials('not-in-map')).toBe('?');
    });

    it('falls back to the email initial when names are empty', () => {
      comp.members = [
        makeMember({
          userId: 'user-2',
          user: {
            id: 'u2',
            firstName: '',
            lastName: '',
            email: 'carol@example.com',
            pictureUrl: null,
          } as never,
        }),
      ];
      comp.ngOnChanges(makeChanges('members', [], comp.members));

      expect(comp.memberInitials('user-2')).toBe('C');
    });
  });

  // ── rsvpSeverity ──────────────────────────────────────────────────────────

  describe('rsvpSeverity()', () => {
    it('returns "success" for YES', () => {
      expect(comp.rsvpSeverity('YES')).toBe('success');
    });

    it('returns "warn" for MAYBE', () => {
      expect(comp.rsvpSeverity('MAYBE')).toBe('warn');
    });

    it('returns "danger" for NO', () => {
      expect(comp.rsvpSeverity('NO')).toBe('danger');
    });

    it('returns "secondary" for PENDING and any unknown status', () => {
      expect(comp.rsvpSeverity('PENDING')).toBe('secondary');
      expect(comp.rsvpSeverity('OTHER')).toBe('secondary');
    });
  });
});
