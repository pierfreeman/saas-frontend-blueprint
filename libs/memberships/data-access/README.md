# @saas-frontend/memberships/data-access

HTTP client for the org memberships endpoints (`/organizations/:orgId/memberships/*`).

**Import path**: `@saas-frontend/memberships/data-access`

---

## Exports

| Symbol                     | Kind    | Description                                    |
| -------------------------- | ------- | ---------------------------------------------- |
| `MembershipsApi`           | Service | HTTP client for all membership operations      |
| `CreateMembershipDto`      | Type    | Payload for creating a membership directly     |
| `UpdateMembershipDto`      | Type    | Payload for changing a member's role           |
| `InviteMemberDto`          | Type    | Payload for inviting a member by email         |
| `MembershipRole`           | Type    | `'OWNER' \| 'ADMIN' \| 'MEMBER'`               |
| `Membership`               | Type    | Full membership object (create response shape) |
| `MembershipSummary`        | Type    | List item shape (includes user email/name)     |
| `DeleteMembershipResponse` | Type    | Delete response                                |
| `InviteMemberResponse`     | Type    | Invite response                                |

---

## `MembershipsApi`

Root-level singleton. Requires `API_BASE_URL` and `HttpClient`.

### Methods

| Method                             | HTTP                                            | Description                |
| ---------------------------------- | ----------------------------------------------- | -------------------------- |
| `getMemberships(orgId)`            | `GET /organizations/:orgId/memberships`         | List all members of an org |
| `createMembership(orgId, dto)`     | `POST /organizations/:orgId/memberships`        | Add a user as a member     |
| `updateMembership(orgId, id, dto)` | `PATCH /organizations/:orgId/memberships/:id`   | Update member's role       |
| `deleteMembership(orgId, id)`      | `DELETE /organizations/:orgId/memberships/:id`  | Remove a member            |
| `inviteMember(orgId, dto)`         | `POST /organizations/:orgId/memberships/invite` | Invite a user by email     |

All methods return `Observable<T>`.

### Usage

```ts
import { MembershipsApi } from '@saas-frontend/memberships/data-access';

// In route providers
providers: [MembershipsApi, { provide: API_BASE_URL, useValue: environment.apiUrl }]

// List members
this.#membershipsApi.getMemberships(orgId).subscribe(members => this.members.set(members));

// Invite member
this.#membershipsApi.inviteMember(orgId, { email: 'user@example.com', role: 'MEMBER' })
  .subscribe(() => this.loadMembers());

// Update role
this.#membershipsApi.updateMembership(orgId, membershipId, { role: 'ADMIN' })
  .subscribe(updated => /* update local list */);
```

---

## File structure

```
src/lib/
  memberships.api.ts        — MembershipsApi (HTTP)
  memberships.api.types.ts  — type aliases from OpenAPI schema
src/index.ts                — public exports
```
