# Time Tracker App

A time tracking application for managing clients, projects, and time entries. Built with React, TypeScript, and Tailwind CSS.

## Features

- **Authentication**: Secure login with hardcoded credentials
- **Client Management**: Add, edit, and delete clients
- **Project Management**: Track projects with status, work type, and location
- **Time Tracking**: Log time entries with date and hours
- **Dashboard**: Overview with statistics and weekly time chart
- **Data Persistence**: Uses localStorage for data storage
- **Export/Import**: JSON export and import functionality

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui components
- React Router
- date-fns
- Recharts

## Authentication

The application uses environment variables for authentication credentials. For local development, create a `.env` file in the root directory:

```env
VITE_USERNAME=your_username
VITE_PASSWORD=your_password
```

**Note:** The `.env` file is included in `.gitignore` and will not be committed to the repository.

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

4. Preview production build:
```bash
npm run preview
```

## Deployment to Vercel

### Prerequisites

- A GitHub account with the project repository
- A Vercel account (free tier)

### Steps

1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/your-username/time-tracker-app.git
   git push -u origin main
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will automatically detect the Vite configuration
   - Click "Deploy"

3. **Configure Environment Variables in Vercel:**
   - After importing the project, go to "Settings" > "Environment Variables"
   - Add the following variables:
     - `VITE_USERNAME`: your username
     - `VITE_PASSWORD`: your password
   - Click "Save" and redeploy the project

4. **Configuration:**
   - The `vercel.json` file is already configured for Vite
   - The build command is `npm run build`
   - The output directory is `dist`

### Important Notes

- **Data Persistence**: This app uses localStorage, which means:
  - Data is stored in the user's browser
  - Data is NOT shared between devices
  - Clearing browser cache will delete the data
  - Each user has their own separate data

- **Authentication**: The credentials are hardcoded in the code. For production use with multiple users, consider implementing a proper authentication system with a backend.

## Project Structure

```
time-tracker-app/
├── src/
│   ├── components/
│   │   ├── dialogs/      # Dialog components
│   │   ├── layout/       # Layout components (Sidebar)
│   │   └── ui/           # shadcn/ui components
│   ├── context/
│   │   ├── AppContext.tsx    # Application state management
│   │   └── AuthContext.tsx   # Authentication state
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Clients.tsx
│   │   ├── Projects.tsx
│   │   ├── ProjectDetail.tsx
│   │   ├── ClientDetail.tsx
│   │   └── LoginPage.tsx
│   ├── types/
│   │   └── index.ts      # TypeScript type definitions
│   ├── App.tsx
│   └── index.css
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── vercel.json
```

## License

MIT
