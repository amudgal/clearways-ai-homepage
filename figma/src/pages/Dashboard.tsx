import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileText, Calendar, Clock } from 'lucide-react';

interface Analysis {
  id: string;
  title: string;
  date: string;
  timestamp: string;
  status: 'completed' | 'draft';
}

export default function Dashboard() {
  const navigate = useNavigate();
  
  // Check if user is logged in
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  
  // Redirect if not logged in
  if (!isLoggedIn) {
    navigate('/login');
    return null;
  }

  // Mock data - in production this would come from a database
  const [analyses] = useState<Analysis[]>([
    {
      id: '1',
      title: 'AWS Enterprise Deployment - Q4 2024',
      date: '2024-12-10',
      timestamp: '14:32:15',
      status: 'completed',
    },
    {
      id: '2',
      title: 'Azure Multi-Instance Analysis',
      date: '2024-12-08',
      timestamp: '09:15:42',
      status: 'completed',
    },
    {
      id: '3',
      title: 'GCP Cost Optimization Study',
      date: '2024-12-05',
      timestamp: '16:48:23',
      status: 'completed',
    },
    {
      id: '4',
      title: 'Hybrid Cloud Migration Assessment',
      date: '2024-11-28',
      timestamp: '11:22:09',
      status: 'draft',
    },
  ]);

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
            {analyses.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No analyses yet</p>
                <p className="text-gray-400 text-sm mt-2">
                  Create your first analysis to get started
                </p>
              </div>
            ) : (
              analyses.map((analysis) => (
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
                        <h3 className="text-gray-900 mb-1">
                          {analysis.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>{new Date(analysis.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={14} />
                            <span>{analysis.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs ${
                          analysis.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {analysis.status === 'completed' ? 'Completed' : 'Draft'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
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