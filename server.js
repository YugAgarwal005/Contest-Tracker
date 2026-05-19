import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Cache for contests (simple in-memory cache)
  let contestCache = [];
  let lastFetch = 0;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // API route to fetch contests
  app.get('/api/contests', async (req, res) => {
    try {
      const now = Date.now();
      if (contestCache.length > 0 && (now - lastFetch < CACHE_DURATION)) {
        return res.json(contestCache);
      }

      console.log('Fetching contests from multiple sources...');
      
      const fetchPrimary = axios.get('https://kontests.net/api/v1/all', {
        headers: { 'Accept': 'application/json', 'User-Agent': 'ContestHub-Dashboard/1.3' },
        timeout: 15000 // Increased for stability
      }).then(r => r.data).catch(e => {
        // We have direct fallbacks, so we don't need to log this as a major warning
        return null;
      });

      const fetchCF = axios.get('https://codeforces.com/api/contest.list?gym=false', { timeout: 12000 })
        .then(r => r.data.status === 'OK' ? r.data.result : null)
        .catch(e => {
          console.warn('Codeforces API failed:', e.message);
          return null;
        });

      const fetchLC = axios.post('https://leetcode.com/graphql', {
        query: `
          {
            allContests {
              title
              titleSlug
              startTime
              duration
            }
          }
        `
      }, { timeout: 12000 })
        .then(r => r.data?.data?.allContests || null)
        .catch(e => {
          console.warn('LeetCode API failed:', e.message);
          return null;
        });

      const fetchCC = axios.get('https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 12000
      }).then(r => r.data?.future_contests || null)
        .catch(e => {
          console.warn('CodeChef API failed:', e.message);
          return null;
        });

      const [primaryData, cfData, lcData, ccData] = await Promise.all([
        fetchPrimary, fetchCF, fetchLC, fetchCC
      ]);

      let combined = [];
      const seenNames = new Set();

      const addIfNew = (contest) => {
        const key = `${contest.site.toLowerCase()}-${contest.name.toLowerCase()}`.trim();
        if (!seenNames.has(key)) {
          combined.push(contest);
          seenNames.add(key);
        }
      };

      const allowedSites = new Set(['codeforces', 'codechef', 'leetcode']);

      if (Array.isArray(primaryData)) {
        primaryData.forEach(c => {
          if (c.name && c.start_time && c.end_time) {
            const site = (c.site || 'Other').toLowerCase().replace(/\s/g, '');
            if (allowedSites.has(site)) {
              addIfNew({ ...c, site: c.site || 'Other' });
            }
          }
        });
      }

      if (Array.isArray(cfData)) {
        cfData.filter(c => c.phase === 'BEFORE' || c.phase === 'CODING').forEach(c => {
          const start = new Date(c.startTimeSeconds * 1000);
          const end = new Date((c.startTimeSeconds + c.durationSeconds) * 1000);
          addIfNew({
            name: c.name,
            url: `https://codeforces.com/contests/${c.id}`,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            duration: c.durationSeconds.toString(),
            site: 'CodeForces',
            status: c.phase === 'BEFORE' ? 'BEFORE' : 'CODING',
            in_24_hours: (c.startTimeSeconds * 1000 - Date.now() < 86400000) ? 'Yes' : 'No'
          });
        });
      }

      // Supplement with LC direct (removed acData block)
      if (Array.isArray(lcData)) {
        lcData.forEach(c => {
          const start = new Date(c.startTime * 1000);
          const end = new Date((c.startTime + c.duration) * 1000);
          if (end.getTime() > Date.now()) {
            addIfNew({
              name: c.title,
              url: `https://leetcode.com/contest/${c.titleSlug}`,
              start_time: start.toISOString(),
              end_time: end.toISOString(),
              duration: c.duration.toString(),
              site: 'LeetCode',
              status: start.getTime() > Date.now() ? 'BEFORE' : 'CODING',
              in_24_hours: (c.startTime * 1000 - Date.now() < 86400000) ? 'Yes' : 'No'
            });
          }
        });
      }

      // Supplement with CC direct
      if (Array.isArray(ccData)) {
        ccData.forEach(c => {
          const start = new Date(c.contest_start_date_iso || c.contest_start_date);
          const durationSeconds = parseInt(c.contest_duration) * 60;
          const end = new Date(start.getTime() + durationSeconds * 1000);
          if (end.getTime() > Date.now()) {
            addIfNew({
              name: c.contest_name,
              url: `https://www.codechef.com/${c.contest_code}`,
              start_time: start.toISOString(),
              end_time: end.toISOString(),
              duration: durationSeconds.toString(),
              site: 'CodeChef',
              status: start.getTime() > Date.now() ? 'BEFORE' : 'CODING',
              in_24_hours: (start.getTime() - Date.now() < 86400000) ? 'Yes' : 'No'
            });
          }
        });
      }

      if (combined.length > 0) {
        contestCache = combined;
        lastFetch = now;
        return res.json(combined);
      }

      // If everything failed but we have cache, use it
      if (contestCache.length > 0) {
        return res.json(contestCache);
      }

      res.json([]);

    } catch (error) {
      console.error('API Error:', error.message);
      res.json(contestCache.length > 0 ? contestCache : []);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
