import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type {
  Book,
  ClubEvent,
  GameDetail,
  GameSummary,
  PostDetail,
  PostSummary,
} from '../../../shared/models';

/**
 * Public, read-only content. Each method returns an `httpResource`, so call
 * them from a component field initializer (an injection context).
 */
@Injectable({ providedIn: 'root' })
export class ContentApi {
  games() {
    return httpResource<GameSummary[]>(() => '/api/games', { defaultValue: [] });
  }

  game(id: () => string | undefined) {
    return httpResource<GameDetail>(() => {
      const value = id();
      return value ? `/api/games/${encodeURIComponent(value)}` : undefined;
    });
  }

  posts() {
    return httpResource<PostSummary[]>(() => '/api/posts', { defaultValue: [] });
  }

  post(slug: () => string | undefined) {
    return httpResource<PostDetail>(() => {
      const value = slug();
      return value ? `/api/posts/${encodeURIComponent(value)}` : undefined;
    });
  }

  events() {
    // Not /api/events: ad/tracker blockers block that path.
    return httpResource<ClubEvent[]>(() => '/api/programme', { defaultValue: [] });
  }

  event(id: () => string | undefined) {
    return httpResource<ClubEvent>(() => {
      const value = id();
      return value ? `/api/programme/${encodeURIComponent(value)}` : undefined;
    });
  }

  books() {
    return httpResource<Book[]>(() => '/api/books', { defaultValue: [] });
  }
}
