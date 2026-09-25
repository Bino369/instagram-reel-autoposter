import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Film,
  Info
} from 'lucide-react';
import { logApi } from '../services/api';

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await logApi.list();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === 'All') return true;
    return log.status.toLowerCase() === filter.toLowerCase();
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Activity & Posting Logs</h1>
          <p className="text-sm text-slate-400 mt-1">
            Audit trail of all automated and manual Instagram post attempts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium">
            {['All', 'Success', 'Failed'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filter === tab
                    ? 'bg-pink-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors disabled:opacity-50"
            title="Refresh logs"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center">
          <RefreshCw size={24} className="animate-spin text-pink-400 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading activity logs...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center space-y-3">
          <FileText size={32} className="text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-white">No logs recorded yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Once the scheduler posts a reel or you trigger "Post Now", detailed execution records will appear here.
          </p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
          <div className="divide-y divide-slate-800/80">
            {filteredLogs.map((log) => {
              const isSuccess = log.status.toLowerCase() === 'success';
              return (
                <div key={log.id} className="p-4 sm:p-5 hover:bg-slate-900/50 transition-colors flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isSuccess
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {isSuccess ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          isSuccess
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {log.status}
                        </span>
                        {log.video_id && (
                          <span className="text-xs text-slate-400 font-mono">
                            Video ID #{log.video_id}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                        <Clock size={12} />
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>

                    <p className={`text-sm mt-1 break-words font-normal ${
                      isSuccess ? 'text-slate-200' : 'text-rose-300 font-mono text-xs bg-black/40 p-2.5 rounded-xl border border-rose-500/20'
                    }`}>
                      {log.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
