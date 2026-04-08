import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-remote-unavailable',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-6"
    >
      <i class="pi pi-exclamation-triangle text-amber-500 text-5xl"></i>
      <h2 class="text-xl font-semibold text-zinc-700">
        Section temporarily unavailable
      </h2>
      <p class="text-zinc-500 max-w-sm">
        The
        <strong>{{ remoteName }}</strong>
        section could not be loaded. This may be a temporary issue.
      </p>
      <button
        class="px-5 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        (click)="reload()"
      >
        Refresh page
      </button>
    </div>
  `,
})
export class RemoteUnavailableComponent {
  readonly #route = inject(ActivatedRoute);

  readonly remoteName: string =
    (this.#route.snapshot.data['remoteName'] as string | undefined) ??
    'requested';

  reload(): void {
    globalThis.location.reload();
  }
}
