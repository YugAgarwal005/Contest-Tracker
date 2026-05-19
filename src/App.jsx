import React, { useMemo } from 'react';
import { format, differenceInSeconds, parseISO } from 'date-fns';
import { ExternalLink, Calendar, Clock, Trophy, Search, Filter } from 'lucide-react';

const PLATFORM_COLORS = {
  'codeforces': 'text-blue-400 border-blue-400/30 bg-blue-400/5',
  'codechef': 'text-amber-400 border-amber-400/30 bg-amber-400/5',
  'leetcode': 'text-orange-400 border-orange-400/30 bg-orange-400/5',
};

const DEFAULT_PLATFORM_STYLE = 'text-gray-400 border-gray-400/30 bg-gray-400/5';

export function ContestCard({ contest }) {
  const [timeLeft, setTimeLeft] = React.useState('');
  let startDate;
  let endDate;
  let formattedStart = 'TBA';
  
  try {
    if (!contest.start_time || !contest.end_time) {
      return null;
    }
    startDate = parseISO(contest.start_time);
    endDate = parseISO(contest.end_time);
    if (isNaN(startDate.getTime())) return null;
    formattedStart = format(startDate, 'MMM d, HH:mm');
  } catch (e) {
    return null;
  }

  React.useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      if (!startDate || !endDate) return;
      
      if (now < startDate) {
        const diff = differenceInSeconds(startDate, now);
        const d = Math.floor(diff / 86400);
        const h = Math.floor((diff % 86400) / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        setTimeLeft(`Starts in ${d > 0 ? `${d}d ` : ''}${h}h ${m}m ${s}s`);
      } else if (now < endDate) {
        const diff = differenceInSeconds(endDate, now);
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        setTimeLeft(`Ends in ${h}h ${m}m ${s}s`);
      } else {
        setTimeLeft('Contest Ended');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [startDate, endDate]);

  const siteKey = (contest.site || '').toLowerCase();
  const platformStyle = PLATFORM_COLORS[siteKey] || DEFAULT_PLATFORM_STYLE;
  const isRunning = new Date() >= startDate && new Date() <= endDate;

  return (
    <div className="group relative bg-[#121212] border border-white/10 rounded-xl p-5 hover:border-indigo-500/50 transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${platformStyle}`}>
          {contest.site || 'Other'}
        </span>
        {isRunning ? (
          <span className="flex items-center gap-1 text-green-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block mr-1"></span>
            Live Now
          </span>
        ) : contest.in_24_hours === 'Yes' && (
          <span className="flex items-center gap-1 text-rose-500 text-[10px] font-bold uppercase tracking-wider">
            <Clock className="w-3 h-3" />
            Soon
          </span>
        )}
      </div>

      <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 min-h-[3.5rem] group-hover:text-indigo-400 transition-colors">
        {contest.name || 'Untitled Contest'}
      </h3>

      <div className="mb-4">
        <p className="text-indigo-400 text-xs font-mono font-semibold">{timeLeft}</p>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 text-gray-400 text-sm font-mono">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span>{formattedStart}</span>
        </div>
        <div className="flex items-center gap-3 text-gray-400 text-sm font-mono">
          <Clock className="w-4 h-4 text-gray-500" />
          <span>{contest.duration ? Math.round(parseInt(contest.duration) / 3600) : '?' }h Duration</span>
        </div>
      </div>

      <a
        href={contest.url}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-indigo-600 text-white font-medium rounded-lg transition-all duration-200 border border-white/10"
      >
        View Contest
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
}

export default function App() {
  const [contests, setContests] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [selectedSite, setSelectedSite] = React.useState('All');
  const [error, setError] = React.useState(null);
  const [lastUpdated, setLastUpdated] = React.useState(null);

  const fetchData = React.useCallback(() => {
    setLoading(true);
    fetch('/api/contests')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setContests(data);
        setLastUpdated(new Date());
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sites = useMemo(() => {
    const s = new Set(contests.map(c => c.site));
    return ['All', ...Array.from(s)].sort();
  }, [contests]);

  const filteredContests = useMemo(() => {
    const now = new Date();
    
    let result = contests.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
      const matchesSite = selectedSite === 'All' || c.site === selectedSite;
      
      let isFuture = true;
      try {
        if (!c.end_time) return false;
        const endTime = parseISO(c.end_time);
        isFuture = endTime > now;
      } catch (e) {
        isFuture = true;
      }

      return matchesSearch && matchesSite && isFuture;
    });

    result = result.filter(c => c.status === 'BEFORE' || c.status === 'CODING');
    
    return result.sort((a, b) => {
      try {
        const aStart = parseISO(a.start_time).getTime();
        const bStart = parseISO(b.start_time).getTime();
        
        if (a.status === 'CODING' && b.status !== 'CODING') return -1;
        if (a.status !== 'CODING' && b.status === 'CODING') return 1;
        
        return aStart - bStart;
      } catch (e) {
        return 0;
      }
    });
  }, [contests, search, selectedSite]);

  return (
    <div className="min-h-screen dashboard-grid pb-20">
      <nav className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Trophy className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Contest<span className="text-indigo-500">Hub</span></h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Competitive Gps</p>
            </div>
          </div>

          <div className="flex-1 max-w-lg w-full relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search contests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-11 pr-4 focus:outline-none focus:border-indigo-500/50 transition-all text-sm"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto max-w-full no-scrollbar pb-1 md:pb-0">
            {sites.map(site => (
              <button
                key={site}
                onClick={() => setSelectedSite(site)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedSite === site
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {site}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-12">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Upcoming Contests</h2>
            <div className="flex items-center gap-3">
              <p className="text-gray-500 text-sm">Tracking {filteredContests.length} events across platforms</p>
              {lastUpdated && (
                <>
                  <span className="text-gray-700">•</span>
                  <p className="text-gray-600 text-[10px] uppercase tracking-wider font-mono">
                    Last Sync: {format(lastUpdated, 'HH:mm:ss')}
                  </p>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-medium border border-white/10 transition-all disabled:opacity-50"
            >
              <Clock className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Feed
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-[#121212] border border-white/10 rounded-xl p-5 h-[280px] animate-pulse">
                <div className="h-4 bg-white/5 rounded w-1/4 mb-6"></div>
                <div className="h-6 bg-white/5 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-white/5 rounded w-1/2 mb-8"></div>
                <div className="h-10 bg-white/5 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 text-rose-500">
              <Filter className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Failed to load contests</h3>
            <p className="text-gray-500 max-w-xs">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredContests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredContests.map((contest, idx) => (
              <ContestCard key={`${contest.site}-${contest.name}-${idx}`} contest={contest} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
              <Filter className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No contests found</h3>
            <p className="text-gray-500 max-w-xs">Try adjusting your search or filters to find what you're looking for.</p>
          </div>
        )}
      </main>
    </div>
  );
}
