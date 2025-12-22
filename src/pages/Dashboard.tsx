import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileText, Calendar, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrl } from '../utils/apiConfig';
import { toast } from 'sonner';

const API_BASE_URL = getApiBaseUrl();

interface Analysis {
  id: string;
  title: string | null;
  status: 'LIVE' | 'SAVED' | 'LOCKED';
  analysis_type?: 'TCO' | 'TIMELINE';
  created_at: string;
  saved_at: string | null;
  updated_at: string;
  created_by_email?: string;
  current_version_number?: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Fetch analyses from database
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchAnalyses = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        
        const response = await fetch(`${API_BASE_URL}/analysis`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            navigate('/login');
            return;
          }
          throw new Error('Failed to fetch analyses');
        }

        const data = await response.json();
        setAnalyses(data.analyses || []);
      } catch (error) {
        console.error('Error fetching analyses:', error);
        toast.error('Failed to load analyses');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyses();
  }, [isAuthenticated, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#17A2B8]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-gray-900 mb-2">Resources & Analysis</h1>
          <p className="text-gray-600">
            Manage and review your cost analysis reports
          </p>
        </div>

        {/* Create New Analysis Button */}
        <div className="mb-8">
          <Link
            to="/analysis/new"
            className="inline-flex items-center gap-2 bg-[#17A2B8] text-white px-6 py-3 rounded-lg hover:bg-[#138C9E] transition-colors shadow-sm"
          >
            <Plus size={20} />
            Create New Analysis
          </Link>
        </div>

        {/* Analysis List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-gray-900">Published Analysis</h2>
          </div>

          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="px-6 py-12 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#17A2B8] mb-4" />
                <p className="text-gray-500">Loading analyses...</p>
              </div>
            ) : analyses.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 font-medium">No analysis published</p>
                <p className="text-gray-400 text-sm mt-2">
                  Create your first analysis to get started
                </p>
              </div>
            ) : (
              analyses.map((analysis) => {
                const displayDate = analysis.saved_at || analysis.created_at;
                const date = new Date(displayDate);
                const dateStr = date.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                });
                const timeStr = date.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                });

                const statusConfig = {
                  LIVE: { label: 'Draft', className: 'bg-yellow-100 text-yellow-800' },
                  SAVED: { label: 'Saved', className: 'bg-blue-100 text-blue-800' },
                  LOCKED: { label: 'Locked', className: 'bg-green-100 text-green-800' },
                };

                const status = statusConfig[analysis.status as 'LIVE' | 'SAVED' | 'LOCKED'] || statusConfig.SAVED;

                return (
                  <Link
                    key={analysis.id}
                    to={`/analysis/${analysis.id}`}
                    className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-10 h-10 bg-[#17A2B8] bg-opacity-10 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-[#17A2B8]" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-gray-900">
                              {analysis.title || 'Untitled Analysis'}
                            </h3>
                            {analysis.analysis_type && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                                {analysis.analysis_type === 'TCO' ? 'TCO' : 'Timeline'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar size={14} />
                              <span>{dateStr}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock size={14} />
                              <span>{timeStr}</span>
                            </div>
                            {analysis.created_by_email && (
                              <span className="text-xs text-gray-400">
                                by {analysis.created_by_email}
                              </span>
                            )}
                            {analysis.current_version_number && (
                              <span className="text-xs text-gray-400">
                                Version {analysis.current_version_number}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-gray-900 mb-2">About Analysis Reports</h3>
          <p className="text-gray-600 text-sm">
            Each analysis provides comprehensive cost breakdown and optimization recommendations 
            for your MSTR deployment across different cloud platforms. Reports include licensing 
            costs, infrastructure expenses, and resource utilization metrics.
          </p>
        </div>
      </div>
    </div>
  );
}