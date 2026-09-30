import type { Routes } from '@angular/router';

// Route titles are translation keys (see core/title.ts).
import { adminGuard } from './core/auth';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/home').then((m) => m.Home) },
  {
    path: 'games',
    title: 'nav.games',
    loadComponent: () => import('./features/games/game-list').then((m) => m.GameList),
  },
  {
    path: 'games/:id',
    loadComponent: () => import('./features/games/game-view').then((m) => m.GameView),
  },
  {
    path: 'learn',
    title: 'nav.learn',
    loadComponent: () => import('./features/learn/learn-hub').then((m) => m.LearnHub),
  },
  {
    path: 'learn/puzzles',
    title: 'puzzles.title',
    loadComponent: () => import('./features/learn/puzzles').then((m) => m.Puzzles),
  },
  {
    path: 'learn/:slug',
    loadComponent: () => import('./features/learn/lesson-page').then((m) => m.LessonPage),
  },
  {
    path: 'events',
    title: 'nav.events',
    loadComponent: () => import('./features/events/event-list').then((m) => m.EventList),
  },
  {
    path: 'events/:id',
    loadComponent: () => import('./features/events/event-detail').then((m) => m.EventDetail),
  },
  {
    path: 'blog',
    title: 'nav.blog',
    loadComponent: () => import('./features/blog/post-list').then((m) => m.PostList),
  },
  {
    path: 'blog/:slug',
    loadComponent: () => import('./features/blog/post-view').then((m) => m.PostView),
  },
  {
    path: 'books',
    title: 'nav.books',
    loadComponent: () => import('./features/books/book-list').then((m) => m.BookList),
  },
  {
    path: 'analysis',
    title: 'nav.analysis',
    loadComponent: () => import('./features/analysis/analysis').then((m) => m.Analysis),
  },
  {
    path: 'admin/login',
    title: 'title.signIn',
    loadComponent: () => import('./features/admin/login').then((m) => m.Login),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () => import('./features/admin/admin.routes'),
  },
  {
    path: '**',
    title: 'title.notFound',
    loadComponent: () => import('./features/not-found').then((m) => m.NotFound),
  },
];
