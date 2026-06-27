# Frontend UI Files

This folder should contain your beautiful Claude Code UI files:

1. **login.html** - Your login page
2. **dashboard.html** - Your task dashboard
3. **css/style.css** - Responsive styling

## What To Do

1. Copy your login.html from your Claude Code backup into this folder
2. Copy your dashboard.html from your Claude Code backup into this folder
3. Copy your css/style.css from your Claude Code backup into `css/` subfolder

The backend will automatically serve these files at:
- http://your-domain/login.html
- http://your-domain/dashboard.html

All API calls from these pages go to `/api/auth/*` and `/api/tasks/*` endpoints.

**Note:** Make sure your frontend code is configured to call:
- `/api/auth/login` for login (not directly to Supabase)
- `/api/auth/register` for registration
- `/api/tasks` for task operations
- Store JWT token in localStorage after login
- Send token in Authorization header: `Authorization: Bearer <token>`

If you're using your existing Claude Code UI, ensure it's been updated to use the Node.js backend proxies instead of direct Supabase calls.
