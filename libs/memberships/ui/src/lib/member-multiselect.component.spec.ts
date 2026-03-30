import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemberMultiselectComponent } from './member-multiselect.component';
import type { MembershipSummary } from '@saas-frontend/memberships/data-access';

type MultiselectAny = {
  options: {
    userId: string;
    label: string;
    pictureUrl: string | null | undefined;
    initials: string;
  }[];
  selectedIds: string[];
  onModelChange(ids: string[]): void;
} & MemberMultiselectComponent;

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
      pictureUrl: 'https://example.com/avatar.jpg',
    },
    ...overrides,
  } as unknown as MembershipSummary;
}

describe('MemberMultiselectComponent', () => {
  let comp: MultiselectAny;

  beforeEach(() => {
    comp = new MemberMultiselectComponent() as unknown as MultiselectAny;
  });

  // ── members setter / toOption ───────────────────────────────────────────────

  describe('members setter', () => {
    it('maps a member to an option with label "First Last"', () => {
      comp.members = [makeMember()];
      expect(comp.options).toHaveLength(1);
      expect(comp.options[0].label).toBe('Alice Smith');
      expect(comp.options[0].userId).toBe('user-1');
      expect(comp.options[0].initials).toBe('AS');
      expect(comp.options[0].pictureUrl).toBe('https://example.com/avatar.jpg');
    });

    it('falls back to email for label when names are both empty', () => {
      comp.members = [
        makeMember({
          user: {
            id: 'u1',
            firstName: '',
            lastName: '',
            email: 'bob@example.com',
            pictureUrl: null,
          } as never,
        }),
      ];
      expect(comp.options[0].label).toBe('bob@example.com');
    });

    it('falls back to userId for label when user is missing', () => {
      comp.members = [
        { userId: 'anon-1', orgId: 'org-1' } as MembershipSummary,
      ];
      expect(comp.options[0].label).toBe('anon-1');
    });

    it('builds initials from email initial when first+last are empty', () => {
      comp.members = [
        makeMember({
          user: {
            id: 'u1',
            firstName: '',
            lastName: '',
            email: 'carol@example.com',
            pictureUrl: null,
          } as never,
        }),
      ];
      expect(comp.options[0].initials).toBe('C');
    });

    it('sets initials to "?" when there are no names or email', () => {
      comp.members = [{ userId: 'ghost', orgId: 'org-1' } as MembershipSummary];
      expect(comp.options[0].initials).toBe('?');
    });

    it('replaces the options array when called again', () => {
      comp.members = [makeMember()];
      comp.members = [];
      expect(comp.options).toHaveLength(0);
    });
  });

  // ── ControlValueAccessor ────────────────────────────────────────────────────

  describe('writeValue()', () => {
    it('sets selectedIds from the provided array', () => {
      comp.writeValue(['user-1', 'user-2']);
      expect(comp.selectedIds).toEqual(['user-1', 'user-2']);
    });

    it('falls back to empty array when null is passed', () => {
      comp.writeValue(null);
      expect(comp.selectedIds).toEqual([]);
    });
  });

  describe('registerOnChange() and registerOnTouched()', () => {
    it('calls the registered onChange when onModelChange fires', () => {
      const fn = vi.fn();
      comp.registerOnChange(fn);
      comp.onModelChange(['user-1']);
      expect(fn).toHaveBeenCalledWith(['user-1']);
    });

    it('calls the registered onTouched when onModelChange fires', () => {
      const fn = vi.fn();
      comp.registerOnTouched(fn);
      comp.onModelChange([]);
      expect(fn).toHaveBeenCalled();
    });
  });

  describe('onModelChange()', () => {
    it('updates selectedIds and fires onChange + onTouched', () => {
      const onChange = vi.fn();
      const onTouched = vi.fn();
      comp.registerOnChange(onChange);
      comp.registerOnTouched(onTouched);

      comp.onModelChange(['user-1', 'user-2']);

      expect(comp.selectedIds).toEqual(['user-1', 'user-2']);
      expect(onChange).toHaveBeenCalledWith(['user-1', 'user-2']);
      expect(onTouched).toHaveBeenCalled();
    });

    it('treats null/undefined as empty array', () => {
      const onChange = vi.fn();
      comp.registerOnChange(onChange);

      comp.onModelChange(null as unknown as string[]);

      expect(comp.selectedIds).toEqual([]);
      expect(onChange).toHaveBeenCalledWith([]);
    });
  });
});
