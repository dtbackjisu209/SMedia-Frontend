# Social Connect Frontend (Vue 3)

Frontend structure for a social network project with core modules:

- Login
- Register
- Create Post / Feed
- Notifications
- Chat

## Tech Stack

- Vue 3 + TypeScript + Vite
- Vue Router 4
- Pinia
- Axios

## Run

```bash
npm install
npm run dev
```

## Suggested Project Structure

```text
src/
	app/
		layouts/
			AuthLayout.vue
			MainLayout.vue
		router/
			index.ts

	features/
		auth/
			api/
				auth.api.ts
			pages/
				LoginPage.vue
				RegisterPage.vue
			store/
				auth.store.ts

		posts/
			api/
				posts.api.ts
			components/
				CreatePostForm.vue
				PostFeed.vue
			pages/
				FeedPage.vue
			store/
				posts.store.ts

		notifications/
			api/
				notifications.api.ts
			components/
				NotificationList.vue
			pages/
				NotificationPage.vue
			store/
				notifications.store.ts

		chat/
			api/
				chat.api.ts
			components/
				ChatThreadList.vue
				ChatWindow.vue
			pages/
				ChatPage.vue
			store/
				chat.store.ts

	shared/
		api/
			http.ts
		components/
			AppHeader.vue
			AppSidebar.vue
		composables/
			useAuth.ts
		constants/
			routes.ts
		types/
			social.ts

	App.vue
	env.d.ts
	main.ts
	style.css
```

## Notes

- API files currently use mocked data for quick development.
- Replace mock implementations in `features/*/api` with real backend endpoints.
- Configure API base URL in `.env` from `.env.example`.
