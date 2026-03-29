# @saas-frontend/planning/feature

Angular feature library for the org planning/calendar UI. Implements the full calendar view with event CRUD, RRULE builder, RSVP, exceptions, and live conflict checking.

**Import path**: `@saas-frontend/planning/feature`
**Route**: loaded lazily at `/planning` inside the Platform shell.

---

## Components

| Component                          | Selector                         | Description                                                                                         |
| ---------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------- |
| `PlanningComponent`                | `app-planning`                   | Root feature component. FullCalendar + all dialogs + live conflict checking.                        |
| `PlanningEventFormDialogComponent` | `app-planning-event-form-dialog` | Create / edit dialog. RRULE builder, attendee multiselect, timezone selector, conflict banner.      |
| `PlanningDetailDialogComponent`    | `app-planning-detail-dialog`     | Event detail overlay. RSVP buttons, edit/delete actions gated on `canEditSelected`.                 |
| `PlanningExceptionDialogComponent` | `app-planning-exception-dialog`  | Occurrence override dialog. Supports scope: **This occurrence only** or **This and all following**. |
| `PlanningRruleBuilderComponent`    | `app-planning-rrule-builder`     | Visual RRULE builder with two-way `[(rrule)]` binding. 51 unit tests.                               |

---

## Feature Highlights

### Calendar views

FullCalendar with **month / week / day** views. Deep-link support: `?eventId=<uuid>` query param opens the detail dialog on init.

### Drag-and-drop & resize

`eventDrop` and `eventResize` callbacks build an `UpdateEventDto` from new times and call `store.updateEvent()`. On 409 (optimistic lock conflict) the change is reverted and a toast is shown.

### Timezone-aware event creation

`PlanningEventFormDialogComponent` includes a filterable **Timezone** selector (`p-select`) pre-populated with all IANA timezones from `Intl.supportedValuesOf('timeZone')`. Each option displays the offset (`Europe/Rome (GMT+2)`). On first open the selector defaults to the **browser's local timezone** via `browserTimezone()`. For existing events the stored `eventTimezone` is restored from the DB.

### Live conflict checking

`PlanningComponent` debounces `draftChanged` events from the form (250 ms) and calls `PlanningApi.listConflicts()` for the draft's `[start, end)` window. A sequential-request guard (`#conflictReqSeq`) discards stale responses. When conflicts are found an orange warning banner appears inside the form dialog showing:

- Conflict count
- Up to 3 preview lines: `"Title (Mar 28, 10:00 AM CET – 11:00 AM)"` — time formatted in the **event's own timezone** via `Intl.DateTimeFormat` with `timeZoneName: 'short'`

### RRULE builder

`PlanningRruleBuilderComponent` is a standalone, reusable component with:

- Frequency dropdown (None / Daily / Weekly / Monthly / Yearly)
- Interval input ("Every N day(s)/…")
- By-day pill buttons (Mo–Su), visible for weekly only; always keeps ≥ 1 selected
- End-type radio: Never / After N occurrences / On date
- Two-way `[(rrule)]` binding: parses with `RRule.fromString()`, emits with `new RRule(opts).toString()`

### "This and Following" series split

`PlanningExceptionDialogComponent` exposes an **Apply to** radio group:

- **This occurrence only** → calls `store.createException()` (single `EventException` upsert)
- **This and all following occurrences** → two sub-paths:
  - **Cancel** (checkbox checked) → calls `store.updateEvent({ rruleUntilUtc })`, setting the series end to 1 ms before the split occurrence. `RecurrenceService` on the backend caps expansion at this value even when the RRULE string has no `UNTIL` clause.
  - **Reschedule / rename** (checkbox unchecked) → calls `store.splitSeries()` which hits `POST /:id/split`. The original series is truncated and a new tail event is created starting at the split point (with optional new `startUtc`, `endUtc`, or `title`).

### Reminder notifications

The create/edit form exposes a **Reminder** `p-select` dropdown driven by the `REMINDER_OPTIONS` preset list:

| Label             | Value (`reminderMinutes`) |
| ----------------- | ------------------------- |
| No reminder       | `null`                    |
| 5 minutes before  | `5`                       |
| 10 minutes before | `10`                      |
| 15 minutes before | `15`                      |
| 30 minutes before | `30`                      |
| 1 hour before     | `60`                      |
| 2 hours before    | `120`                     |
| 1 day before      | `1440`                    |

The detail dialog shows a bell-icon row with a human-readable label (e.g. _"Reminder: 1 hour before"_) when `event.reminderMinutes` is set. Clearing the reminder (selecting "No reminder") sends `reminderMinutes: null` in the update DTO.

> **TODO (deferred):** custom reminder values (free-text minutes) are not yet supported — only the preset options above.

### Permissions

| Action                  | Condition                                               |
| ----------------------- | ------------------------------------------------------- |
| Create event            | `PLANNING_MANAGE` permission                            |
| Edit / delete any event | `PLANNING_MANAGE_ANY` (OWNER or ADMIN)                  |
| Edit / delete own event | `PLANNING_MANAGE` + `createdByUserId === currentUserId` |
| RSVP                    | `ORG_READ` (all members including READ_ONLY)            |
| View calendar           | `ORG_READ`                                              |

---

## Utilities (`planning.utils.ts`)

| Export             | Kind      | Description                                                                                |
| ------------------ | --------- | ------------------------------------------------------------------------------------------ |
| `EventForm`        | Interface | Internal form model (title, startUtc, endUtc, isAllDay, eventTimezone, reminderMinutes, …) |
| `browserTimezone`  | Function  | Returns `Intl.DateTimeFormat().resolvedOptions().timeZone`, fallback `'UTC'`               |
| `TIMEZONE_OPTIONS` | Constant  | All IANA timezones as `{ label: 'Zone (GMT±N)', value: 'Zone' }[]`                         |
| `REMINDER_OPTIONS` | Constant  | Preset reminder choices as `{ label: string, value: number \| null }[]`                    |
| `toUtcIso`         | Function  | Normalises a datetime-local string to a full ISO 8601 UTC string                           |

---

## Running Tests

```bash
npx nx run planning-feature:test
```

179 tests across 7 spec files:

| Spec file                                      | Tests | Covers                                                                                        |
| ---------------------------------------------- | ----: | --------------------------------------------------------------------------------------------- |
| `planning-rrule-builder.component.spec.ts`     |    51 | RRULE parse, build, round-trip and all interaction paths                                      |
| `planning-reminders.spec.ts`                   |    36 | `REMINDER_OPTIONS` shape invariants, `formatReminder()` for all presets                       |
| `planning-event-form-dialog.component.spec.ts` |    30 | Form dialog rendering, timezone selector, conflict banner                                     |
| `planning.component.spec.ts`                   |    43 | Calendar callbacks, dialogs, split-series paths, conflict debounce, guard branches            |
| `planning-exception-dialog.component.spec.ts`  |     9 | Exception dialog form reset, scope radio, submit                                              |
| `planning.utils.spec.ts`                       |     8 | `browserTimezone`, `toUtcIso`, `toLocalDatetimeInput`, `REMINDER_OPTIONS`, `TIMEZONE_OPTIONS` |
| `planning.utils.module-init.spec.ts`           |     2 | `TIMEZONE_OPTIONS` fallback branches (`supportedValuesOf` / `DateTimeFormat` throws)          |
