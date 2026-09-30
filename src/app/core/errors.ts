import { HttpErrorResponse } from '@angular/common/http';
import type { Resource } from '@angular/core';
import { translate } from '@jsverse/transloco';

/**
 * A resource's value, or `fallback` while it has none. Unlike `value()`,
 * which throws once a request has failed (offline, blocked by a browser
 * extension), this is safe to read anywhere: one failed request must not
 * break the rest of the page.
 */
export function valueOr<T, F>(resource: Resource<T>, fallback: F): Exclude<T, undefined> | F {
  return resource.hasValue() ? (resource.value() as Exclude<T, undefined>) : fallback;
}

/** A sentence in the active language for any failed request. */
export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    switch (error.status) {
      case 0:
        return translate('errors.offline');
      case 400:
        return translate('errors.validation');
      case 401:
        return translate(
          error.url?.includes('/api/auth/login') ? 'errors.credentials' : 'errors.session',
        );
      case 404:
        return translate('errors.notFound');
      case 409:
        return translate('errors.slugTaken');
    }
  }
  return translate('errors.generic');
}

export function isNotFound(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 404;
}
