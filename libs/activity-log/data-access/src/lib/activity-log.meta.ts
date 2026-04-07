export interface ActionMeta {
  label: string;
  value: string;
  severity: 'success' | 'info' | 'warn' | 'danger' | 'secondary';
  icon: string;
}

export const ACTIVITY_LOG_ACTIONS: ActionMeta[] = [
  // Organization
  {
    label: 'Organization created',
    value: 'organization.created',
    severity: 'info',
    icon: 'pi-building',
  },
  {
    label: 'Organization updated',
    value: 'organization.updated',
    severity: 'secondary',
    icon: 'pi-building',
  },
  {
    label: 'Organization deleted',
    value: 'organization.deleted',
    severity: 'danger',
    icon: 'pi-trash',
  },
  {
    label: 'Deletion requested',
    value: 'organization.deletion.requested',
    severity: 'danger',
    icon: 'pi-exclamation-triangle',
  },
  {
    label: 'Export requested',
    value: 'organization.export.requested',
    severity: 'info',
    icon: 'pi-download',
  },
  // Members
  {
    label: 'Member added',
    value: 'membership.created',
    severity: 'info',
    icon: 'pi-user-plus',
  },
  {
    label: 'Role changed',
    value: 'membership.role_changed',
    severity: 'secondary',
    icon: 'pi-pencil',
  },
  {
    label: 'Member removed',
    value: 'membership.deleted',
    severity: 'danger',
    icon: 'pi-user-minus',
  },
  // Users
  {
    label: 'Invite sent',
    value: 'user.created.pending',
    severity: 'info',
    icon: 'pi-send',
  },
  {
    label: 'User provisioned',
    value: 'user.provisioned',
    severity: 'success',
    icon: 'pi-check-circle',
  },
  {
    label: 'User deleted',
    value: 'user.deleted',
    severity: 'danger',
    icon: 'pi-trash',
  },
  // Billing
  {
    label: 'Checkout started',
    value: 'billing.checkout.created',
    severity: 'warn',
    icon: 'pi-shopping-cart',
  },
  {
    label: 'Checkout completed',
    value: 'billing.checkout.completed',
    severity: 'success',
    icon: 'pi-check',
  },
  {
    label: 'Billing portal opened',
    value: 'billing.portal.accessed',
    severity: 'secondary',
    icon: 'pi-external-link',
  },
  {
    label: 'Subscription created',
    value: 'subscription.created',
    severity: 'success',
    icon: 'pi-credit-card',
  },
  {
    label: 'Subscription updated',
    value: 'subscription.updated',
    severity: 'secondary',
    icon: 'pi-refresh',
  },
  {
    label: 'Plan upgraded',
    value: 'subscription.upgraded',
    severity: 'success',
    icon: 'pi-arrow-up',
  },
  {
    label: 'Subscription cancelled',
    value: 'subscription.cancelled',
    severity: 'danger',
    icon: 'pi-times-circle',
  },
  {
    label: 'Subscription canceled',
    value: 'subscription.canceled',
    severity: 'danger',
    icon: 'pi-times-circle',
  },
  {
    label: 'Subscription reactivated',
    value: 'subscription.reactivated',
    severity: 'success',
    icon: 'pi-replay',
  },
  {
    label: 'Payment succeeded',
    value: 'invoice.payment_succeeded',
    severity: 'success',
    icon: 'pi-check-circle',
  },
  {
    label: 'Payment failed',
    value: 'invoice.payment_failed',
    severity: 'danger',
    icon: 'pi-times-circle',
  },
  // Planning
  {
    label: 'Event created',
    value: 'planning.event.created',
    severity: 'info',
    icon: 'pi-calendar-plus',
  },
  {
    label: 'Event updated',
    value: 'planning.event.updated',
    severity: 'secondary',
    icon: 'pi-calendar',
  },
  {
    label: 'Event deleted',
    value: 'planning.event.deleted',
    severity: 'danger',
    icon: 'pi-calendar-times',
  },
  {
    label: 'RSVP updated',
    value: 'planning.event.rsvp',
    severity: 'info',
    icon: 'pi-calendar-clock',
  },
  {
    label: 'Series split',
    value: 'planning.event.series.split',
    severity: 'secondary',
    icon: 'pi-share-alt',
  },
  {
    label: 'Exception created',
    value: 'planning.event.exception.created',
    severity: 'info',
    icon: 'pi-calendar-plus',
  },
  // Files
  {
    label: 'File uploaded',
    value: 'file.upload.confirmed',
    severity: 'success',
    icon: 'pi-upload',
  },
  {
    label: 'File downloaded',
    value: 'file.download.requested',
    severity: 'secondary',
    icon: 'pi-download',
  },
  {
    label: 'File deleted',
    value: 'file.deleted',
    severity: 'danger',
    icon: 'pi-trash',
  },
  // Jobs
  {
    label: 'Job created',
    value: 'job.created',
    severity: 'info',
    icon: 'pi-send',
  },
  {
    label: 'Job processing',
    value: 'job.processing',
    severity: 'warn',
    icon: 'pi-sync',
  },
  {
    label: 'Job completed',
    value: 'job.completed',
    severity: 'success',
    icon: 'pi-check-circle',
  },
  {
    label: 'Job failed',
    value: 'job.failed',
    severity: 'danger',
    icon: 'pi-times-circle',
  },
  // Email
  {
    label: 'Email sent',
    value: 'email.sent',
    severity: 'success',
    icon: 'pi-envelope',
  },
  {
    label: 'Email failed',
    value: 'email.failed',
    severity: 'danger',
    icon: 'pi-envelope',
  },
  // Notifications
  {
    label: 'Notification sent',
    value: 'notification.created',
    severity: 'info',
    icon: 'pi-bell',
  },
];

export const ACTIVITY_LOG_ACTION_MAP = new Map<string, ActionMeta>(
  ACTIVITY_LOG_ACTIONS.map((a) => [a.value, a]),
);

export const ENTITY_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Organization', value: 'organization' },
  { label: 'Membership', value: 'membership' },
  { label: 'User', value: 'user' },
  { label: 'Planning Event', value: 'event' },
  { label: 'Job', value: 'job' },
  { label: 'File', value: 'File' },
  { label: 'Notification', value: 'notification' },
  { label: 'Email', value: 'email' },
];

export const ENTITY_TYPE_MAP = new Map<string, string>(
  ENTITY_TYPE_OPTIONS.map((e) => [e.value, e.label]),
);

export function getActionLabel(action: string): string {
  return ACTIVITY_LOG_ACTION_MAP.get(action)?.label ?? action;
}

export function getActionSeverity(action: string): ActionMeta['severity'] {
  return ACTIVITY_LOG_ACTION_MAP.get(action)?.severity ?? 'secondary';
}

export function getActionIcon(action: string): string {
  return ACTIVITY_LOG_ACTION_MAP.get(action)?.icon ?? 'pi-circle';
}

export function getEntityTypeLabel(entityType: string): string {
  return ENTITY_TYPE_MAP.get(entityType) ?? entityType;
}
