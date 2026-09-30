import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  Book,
  BookInput,
  ClubEvent,
  EventInput,
  GameDetail,
  GameInput,
  GameSummary,
  PostDetail,
  PostInput,
  PostSummary,
} from '../../../shared/models';

/** Shapes of each admin resource: list rows, full items and write payloads. */
export interface AdminResources {
  games: { summary: GameSummary; item: GameDetail; input: GameInput };
  posts: { summary: PostSummary; item: PostDetail; input: PostInput };
  events: { summary: ClubEvent; item: ClubEvent; input: EventInput };
  books: { summary: Book; item: Book; input: BookInput };
}

export type AdminResource = keyof AdminResources;

/** API path per resource. Events live at "programme": ad/tracker blockers block URLs like /api/events. */
const PATHS: Record<AdminResource, string> = {
  games: 'games',
  posts: 'posts',
  events: 'programme',
  books: 'books',
};

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly http = inject(HttpClient);

  /** Reactive list including drafts. Call from an injection context. */
  list<R extends AdminResource>(resource: () => R) {
    return httpResource<AdminResources[R]['summary'][]>(() => `/api/admin/${PATHS[resource()]}`, {
      defaultValue: [],
    });
  }

  get<R extends AdminResource>(
    resource: R,
    id: number | string,
  ): Promise<AdminResources[R]['item']> {
    return firstValueFrom(
      this.http.get<AdminResources[R]['item']>(`/api/admin/${PATHS[resource]}/${id}`),
    );
  }

  create<R extends AdminResource>(
    resource: R,
    input: AdminResources[R]['input'],
  ): Promise<AdminResources[R]['item']> {
    return firstValueFrom(
      this.http.post<AdminResources[R]['item']>(`/api/admin/${PATHS[resource]}`, input),
    );
  }

  update<R extends AdminResource>(
    resource: R,
    id: number | string,
    input: AdminResources[R]['input'],
  ): Promise<AdminResources[R]['item']> {
    return firstValueFrom(
      this.http.put<AdminResources[R]['item']>(`/api/admin/${PATHS[resource]}/${id}`, input),
    );
  }

  delete(resource: AdminResource, id: number | string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/admin/${PATHS[resource]}/${id}`));
  }
}
