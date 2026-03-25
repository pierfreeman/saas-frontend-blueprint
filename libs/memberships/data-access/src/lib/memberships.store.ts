import { computed, Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MembershipsApi } from './memberships.api';
import type {
  MembershipSummary,
  Membership,
  MembershipRole,
  CreateMembershipDto,
  InviteMemberDto,
  InviteMemberResponse,
} from './memberships.api.types';
import type { ApiError } from '@org/shared/util-error';

@Injectable({ providedIn: 'root' })
export class MembershipsStore {
  readonly #api = inject(MembershipsApi);

  // ── State ──────────────────────────────────────────────────────────────────
  readonly memberships = signal<MembershipSummary[]>([]);
  readonly loadingList = signal<boolean>(false);
  readonly loadingMutation = signal<boolean>(false);
  readonly error = signal<ApiError | null>(null);

  // ── Computed ───────────────────────────────────────────────────────────────
  /** Set during app bootstrap via OrgContextService / shell after login. */
  readonly #currentUserIdSignal = signal<string | null>(null);
  readonly currentUserId = this.#currentUserIdSignal.asReadonly();

  readonly currentMembership = computed<MembershipSummary | null>(() => {
    const uid = this.currentUserId();
    if (!uid) return null;
    return this.memberships().find((m) => m.userId === uid) ?? null;
  });

  readonly currentUserRole = computed<MembershipRole | null>(
    () => this.currentMembership()?.role ?? null,
  );

  setCurrentUserId(id: string | null): void {
    this.#currentUserIdSignal.set(id);
  }

  // ── Methods ────────────────────────────────────────────────────────────────
  async loadMemberships(orgId: string): Promise<void> {
    this.loadingList.set(true);
    this.error.set(null);
    try {
      const list = await firstValueFrom(this.#api.getMemberships(orgId));
      this.memberships.set(list);
    } catch (err) {
      this.error.set(err as ApiError);
    } finally {
      this.loadingList.set(false);
    }
  }

  async createMembership(
    orgId: string,
    dto: CreateMembershipDto,
  ): Promise<Membership | null> {
    this.loadingMutation.set(true);
    this.error.set(null);
    try {
      const created = await firstValueFrom(
        this.#api.createMembership(orgId, dto),
      );
      await this.loadMemberships(orgId);
      return created;
    } catch (err) {
      this.error.set(err as ApiError);
      return null;
    } finally {
      this.loadingMutation.set(false);
    }
  }

  async inviteMember(
    orgId: string,
    dto: InviteMemberDto,
  ): Promise<InviteMemberResponse | null> {
    this.loadingMutation.set(true);
    this.error.set(null);
    try {
      const result = await firstValueFrom(this.#api.inviteMember(orgId, dto));
      await this.loadMemberships(orgId);
      return result;
    } catch (err) {
      this.error.set(err as ApiError);
      return null;
    } finally {
      this.loadingMutation.set(false);
    }
  }

  async updateMemberRole(
    orgId: string,
    membershipId: string,
    role: MembershipRole,
  ): Promise<void> {
    this.loadingMutation.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.#api.updateMembership(orgId, membershipId, { role }),
      );
      this.memberships.update((list) =>
        list.map((m) => (m.id === membershipId ? { ...m, role } : m)),
      );
    } catch (err) {
      this.error.set(err as ApiError);
    } finally {
      this.loadingMutation.set(false);
    }
  }

  async removeMember(orgId: string, membershipId: string): Promise<void> {
    this.loadingMutation.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.#api.deleteMembership(orgId, membershipId));
      this.memberships.update((list) =>
        list.filter((m) => m.id !== membershipId),
      );
    } catch (err) {
      this.error.set(err as ApiError);
    } finally {
      this.loadingMutation.set(false);
    }
  }

  flush(): void {
    this.memberships.set([]);
    this.loadingList.set(false);
    this.loadingMutation.set(false);
    this.error.set(null);
    this.#currentUserIdSignal.set(null);
  }
}
