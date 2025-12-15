// Sidebar Navigation Component - Analysis History
// Shows "My Analyses" and "Current Analysis" sections

import { Link, useParams } from 'react-router-dom';
import { FileText, Lock, Save, Clock } from 'lucide-react';
import { Analysis, AnalysisStatus } from '../types';
import { format } from 'date-fns';

interface AnalysisSidebarProps {
  analyses: Analysis[];
  currentAnalysisId?: string;
}

export default function AnalysisSidebar({ analyses, currentAnalysisId }: AnalysisSidebarProps) {
  const { id } = useParams();

  // Filter saved/locked analyses (exclude LIVE)
  const savedAnalyses = analyses.filter(a => a.status !== 'LIVE');

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: AnalysisStatus) => {
    if (status === 'LOCKED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">
          <Lock size={12} />
          Locked
        </span>
      );
    }
    if (status === 'SAVED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
          <Save size={12} />
          Saved
        </span>
      );
    }
    return null;
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4 space-y-6">
        {/* Current Analysis Section */}
        {currentAnalysisId && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Current Analysis
            </h3>
            <div className="bg-[#17A2B8] bg-opacity-10 border border-[#17A2B8] rounded-lg p-3">
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-[#17A2B8] mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {analyses.find(a => a.id === currentAnalysisId)?.title || 'Untitled Analysis'}
                  </p>
                  <div className="mt-1">
                    {getStatusBadge(analyses.find(a => a.id === currentAnalysisId)?.status || 'LIVE')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* My Analyses Section */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            My Analyses
          </h3>
          {savedAnalyses.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">No saved analyses</p>
            </div>
          ) : (
            <div className="space-y-1">
              {savedAnalyses.map((analysis) => {
                const isActive = id === analysis.id;
                return (
                  <Link
                    key={analysis.id}
                    to={`/analysis/${analysis.id}`}
                    className={`block p-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-[#17A2B8] bg-opacity-10 border border-[#17A2B8]'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <FileText
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          isActive ? 'text-[#17A2B8]' : 'text-gray-400'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${
                            isActive ? 'text-[#17A2B8]' : 'text-gray-900'
                          }`}
                        >
                          {analysis.title || 'Untitled Analysis'}
                        </p>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock size={12} />
                            <span>{formatDate(analysis.saved_at || analysis.updated_at)}</span>
                          </div>
                          {getStatusBadge(analysis.status)}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

