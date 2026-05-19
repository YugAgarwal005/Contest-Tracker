# Contest Hub 🏆

Contest Hub is a modern, real-time dashboard that aggregates competitive programming contests from multiple platforms including **Codeforces**, **LeetCode**, and **CodeChef**. It provides a unified view of upcoming and live events, helping developers stay on top of the competitive landscape.

**🔗 Live Demo: [https://contest-tracker-ivory.vercel.app/](https://contest-tracker-ivory.vercel.app/)**

## ✨ Features

- **Multi-Platform Aggregation:** Real-time data from Codeforces, LeetCode, and CodeChef.
- **Live Countdown:** Dynamic timers showing time until a contest starts or ends.
- **Smart Filtering:** Search by contest name or filter by specific platforms.
- **Responsive Design:** Optimized for both desktop and mobile viewing with a sleek dark-themed UI.
- **High Stability:** Robust backend with failover logic and intelligent caching to handle slow third-party APIs.

## 🚀 Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide React (Icons), date-fns.
- **Backend:** Node.js (Express).
- **API Communication:** Axios with custom headers to bypass common bot-detection filters.

## 🛠️ Getting Started

### Local Development

1. **Clone the repository.**
2. **Install Dependencies:**
   ```bash
   npm install
   ```
3. **Configure Environment Variables:**
   Create a `.env` file in the root directory based on `.env.example`.
4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

### Production Build

```bash
npm run build
npm start
```

## 🔑 Environment Variables

The application uses the following environment variables. Ensure they are set in your deployment environment or your local `.env` file:

| Variable | Description | Source |
|----------|-------------|--------|
| `GEMINI_API_KEY` | Required if adding AI features | [Google AI Studio](https://aistudio.google.com/app/apikey) |

