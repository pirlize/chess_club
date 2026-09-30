import type { Routes } from '@angular/router';
import { AdminList, ADMIN_LISTS } from './admin-list';
import { AdminShell } from './admin-shell';
import { BookEditor } from './book-editor';
import { EventEditor } from './event-editor';
import { GameEditor } from './game-editor';
import { PostEditor } from './post-editor';
import { unsavedChangesGuard } from './resource-editor';

export default [
  {
    path: '',
    component: AdminShell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'games' },

      {
        path: 'games',
        title: 'title.adminGames',
        component: AdminList,
        data: { list: ADMIN_LISTS.games },
      },
      {
        path: 'games/new',
        title: 'title.newGame',
        component: GameEditor,
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'games/:id',
        title: 'title.editGame',
        component: GameEditor,
        canDeactivate: [unsavedChangesGuard],
      },

      {
        path: 'posts',
        title: 'title.adminPosts',
        component: AdminList,
        data: { list: ADMIN_LISTS.posts },
      },
      {
        path: 'posts/new',
        title: 'title.newPost',
        component: PostEditor,
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'posts/:id',
        title: 'title.editPost',
        component: PostEditor,
        canDeactivate: [unsavedChangesGuard],
      },

      {
        path: 'events',
        title: 'title.adminEvents',
        component: AdminList,
        data: { list: ADMIN_LISTS.events },
      },
      {
        path: 'events/new',
        title: 'title.newEvent',
        component: EventEditor,
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'events/:id',
        title: 'title.editEvent',
        component: EventEditor,
        canDeactivate: [unsavedChangesGuard],
      },

      {
        path: 'books',
        title: 'title.adminBooks',
        component: AdminList,
        data: { list: ADMIN_LISTS.books },
      },
      {
        path: 'books/new',
        title: 'title.newBook',
        component: BookEditor,
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'books/:id',
        title: 'title.editBook',
        component: BookEditor,
        canDeactivate: [unsavedChangesGuard],
      },
    ],
  },
] satisfies Routes;
