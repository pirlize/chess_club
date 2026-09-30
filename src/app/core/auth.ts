import { HttpClient, HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import type { AdminUser, LoginRequest, SessionResponse } from '../../../shared/models';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);

  /** `undefined` until the session has been checked. */
  readonly user = signal<AdminUser | null | undefined>(undefined);

  async refresh(): Promise<AdminUser | null> {
    try {
      const { admin } = await firstValueFrom(this.http.get<SessionResponse>('/api/auth/me'));
      this.user.set(admin);
      return admin;
    } catch {
      this.user.set(null);
      return null;
    }
  }

  async login(credentials: LoginRequest): Promise<AdminUser> {
    const admin = await firstValueFrom(this.http.post<AdminUser>('/api/auth/login', credentials));
    this.user.set(admin);
    return admin;
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post('/api/auth/logout', {})).catch(() => undefined);
    this.user.set(null);
  }
}

export const adminGuard: CanActivateFn = async (_route, state) => {
  // Inject everything before the first await: inject() only works synchronously.
  const auth = inject(Auth);
  const router = inject(Router);
  const user = auth.user() ?? (await auth.refresh());
  return user ? true : router.createUrlTree(['/admin/login'], { queryParams: { next: state.url } });
};

/** Sends the admin back to the sign-in page when their session expires mid-edit. */
export const sessionExpiryInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const router = inject(Router);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        req.url.startsWith('/api/admin/')
      ) {
        auth.user.set(null);
        void router.navigate(['/admin/login'], { queryParams: { next: router.url, expired: 1 } });
      }
      return throwError(() => error);
    }),
  );
};
