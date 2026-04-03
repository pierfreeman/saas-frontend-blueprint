import { describe, it, expect } from 'vitest';
import {
  ACTIVITY_LOG_ACTIONS,
  ACTIVITY_LOG_ACTION_MAP,
  ENTITY_TYPE_OPTIONS,
  ENTITY_TYPE_MAP,
  getActionLabel,
  getActionSeverity,
  getActionIcon,
  getEntityTypeLabel,
} from './activity-log.meta';

describe('ACTIVITY_LOG_ACTIONS', () => {
  it('is a non-empty array', () => {
    expect(ACTIVITY_LOG_ACTIONS.length).toBeGreaterThan(0);
  });

  it('every entry has label, value, severity and icon', () => {
    for (const action of ACTIVITY_LOG_ACTIONS) {
      expect(action.label).toBeTruthy();
      expect(action.value).toBeTruthy();
      expect(['success', 'info', 'warn', 'danger', 'secondary']).toContain(
        action.severity,
      );
      expect(action.icon).toBeTruthy();
    }
  });
});

describe('ACTIVITY_LOG_ACTION_MAP', () => {
  it('has an entry for every action in ACTIVITY_LOG_ACTIONS', () => {
    for (const action of ACTIVITY_LOG_ACTIONS) {
      expect(ACTIVITY_LOG_ACTION_MAP.has(action.value)).toBe(true);
    }
  });

  it('maps a known action value to its metadata', () => {
    const meta = ACTIVITY_LOG_ACTION_MAP.get('membership.created');
    expect(meta?.label).toBe('Member added');
    expect(meta?.severity).toBe('info');
  });
});

describe('ENTITY_TYPE_OPTIONS', () => {
  it('is a non-empty array', () => {
    expect(ENTITY_TYPE_OPTIONS.length).toBeGreaterThan(0);
  });

  it('every entry has label and value', () => {
    for (const opt of ENTITY_TYPE_OPTIONS) {
      expect(opt.label).toBeTruthy();
      expect(opt.value).toBeTruthy();
    }
  });
});

describe('ENTITY_TYPE_MAP', () => {
  it('has an entry for every entity type option', () => {
    for (const opt of ENTITY_TYPE_OPTIONS) {
      expect(ENTITY_TYPE_MAP.has(opt.value)).toBe(true);
    }
  });

  it('maps a known entity type to its label', () => {
    expect(ENTITY_TYPE_MAP.get('membership')).toBe('Membership');
  });
});

describe('getActionLabel()', () => {
  it('returns the label for a known action', () => {
    expect(getActionLabel('organization.created')).toBe('Organization created');
  });

  it('returns the raw action string when unknown', () => {
    expect(getActionLabel('unknown.action')).toBe('unknown.action');
  });
});

describe('getActionSeverity()', () => {
  it('returns the severity for a known action', () => {
    expect(getActionSeverity('organization.deleted')).toBe('danger');
  });

  it('returns "secondary" when action is unknown', () => {
    expect(getActionSeverity('unknown.action')).toBe('secondary');
  });
});

describe('getActionIcon()', () => {
  it('returns the icon for a known action', () => {
    expect(getActionIcon('user.provisioned')).toBe('pi-check-circle');
  });

  it('returns "pi-circle" when action is unknown', () => {
    expect(getActionIcon('unknown.action')).toBe('pi-circle');
  });
});

describe('getEntityTypeLabel()', () => {
  it('returns the label for a known entity type', () => {
    expect(getEntityTypeLabel('organization')).toBe('Organization');
  });

  it('returns the raw entity type string when unknown', () => {
    expect(getEntityTypeLabel('unknown.type')).toBe('unknown.type');
  });
});
