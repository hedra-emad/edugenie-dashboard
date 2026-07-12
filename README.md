# EduGenie — Admin & Instructor Dashboard

The management dashboard for **EduGenie**, an AI-powered e-learning platform. Built with **Angular 20** and **TypeScript**, it gives instructors, admins and super-admins the tools to build courses, manage users, and track revenue.

**Live:** https://edugenie-dashboard.vercel.app
**Related:** [API](https://github.com/hedra-emad/edugenie-api) · [Student web app](https://github.com/hedra-emad/edugenie-student-web)

---

## Features

- **Course builder** — create and manage courses, sections and lessons
- **Instructor workspace** — content management and student progress
- **Instructor analytics** — enrollment, engagement and revenue charts (Chart.js)
- **Admin panel** — user management, approvals, categories, moderation
- **Super-admin** — platform-wide configuration, roles and audit logs
- **Authentication** — JWT and Google OAuth with role-based route guards
- **Settings** — profile, payouts and account configuration

---

## Tech Stack

| Concern | Technology |
|---|---|
| Framework | Angular 20, TypeScript |
| Charts | Chart.js via ng2-charts |
| Forms | Angular Reactive Forms |
| Auth | JWT + Google OAuth, route guards |
| Deployment | Vercel |

---

## Getting Started

```bash
npm install
npm start            # http://localhost:4200
```

### Environment

Set the API base URL in `src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  apiUrl: 'https://edugenie-api.vercel.app',
};
```

### Scripts

```bash
npm start        # dev server
npm run build    # production build
npm run test     # unit tests
npm run lint     # lint
```

---

## Project Structure

```
src/app/features/
├── auth/                    # login, OAuth callback, password reset
├── course-builder/          # course, section and lesson authoring
├── instructor/              # instructor workspace
├── instructor-analytics/    # revenue and engagement charts
├── admin/                   # user and content management
├── superadmin/              # platform administration
├── settings/
└── errors/
```

---

## Team

Built by a 5-developer team for the **ITI Intensive Code Camp — Full-Stack Web & Generative AI Development using MERN**.

Maintainer: [Hedra Emad](https://github.com/hedra-emad) — Team Leader
