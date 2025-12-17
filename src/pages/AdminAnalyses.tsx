// Admin Analysis Management Page
// Only accessible to ADMIN role users
// Allows admins to view all analyses and reassign them to different tenants

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FileText, Building2, User, Calendar, Save, AlertCircle, Search } from 'lucide-react';
import { toast } from 'sonner';
import { getApiBaseUrl } from '../utils/apiConfig';

const API_BASE_URL = getApiBaseUrl();

interface Analysis {
  id: string;
  title: string | null;
  status: 'LIVE' | 'SAVED' | 'LOCKED';
  tenant_id: string;
  tenant_name: string;
  tenant_domain: string;
  created_by_email?: string;
  created_by_username?: string;
  created_at: string;
  updated_at: string;
  saved_at: string | null;
  current_version_number?: number;
}

interface Tenant {
  id: string;
  name: string;
  domain: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export default function AdminAnalyses() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAnalysis, setEditingAnalysis] = useState<Analysis | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (user?.role !== 'ADMIN') {
      toast.error('Admin access required');
      navigate('/dashboard');
      return;
    }

    loadAnalyses();
    loadTenants();
  }, [user, isAuthenticated, navigate]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const loadAnalyses = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/analyses`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to load analyses');

      const data = await response.json();
      setAnalyses(data.analyses || []);
    } catch (error) {
      console.error('Load analyses error:', error);
      toast.error('Failed to load analyses');
    } finally {
      setLoading(false);
    }
  };

  const loadTenants = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/tenants`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to load tenants');

      const data = await response.json();
      setTenants(data.tenants || []);
    } catch (error) {
      console.error('Load tenants error:', error);
      toast.error('Failed to load tenants');
    }
  };

  const handleReassignTenant = async () => {
    if (!editingAnalysis || !selectedTenantId) {
      toast.error('Please select a tenant');
      return;
    }

    if (selectedTenantId === editingAnalysis.tenant_id) {
      toast.error('Analysis is already assigned to this tenant');
      setEditingAnalysis(null);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/analyses/${editingAnalysis.id}/tenant`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ tenant_id: selectedTenantId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reassign analysis');
      }

      toast.success('Analysis reassigned successfully');
      setEditingAnalysis(null);
      setSelectedTenantId('');
      loadAnalyses();
    } catch (error) {
      console.error('Reassign analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reassign analysis');
    }
  };

  const filteredAnalyses = analyses.filter((analysis) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (analysis.title?.toLowerCase().includes(searchLower) || '') ||
      analysis.tenant_name.toLowerCase().includes(searchLower) ||
      analysis.tenant_domain.toLowerCase().includes(searchLower) ||
      (analysis.created_by_email?.toLowerCase().includes(searchLower) || '') ||
      (analysis.created_by_username?.toLowerCase().includes(searchLower) || '')
    );
  });

  if (user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analysis Management</h1>
          <p className="text-gray-600">View and reassign analyses to different clients/tenants</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by title, tenant, or creator..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
            />
          </div>
        </div>

        {/* Reassign Modal */}
        {editingAnalysis && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Reassign Analysis to Client
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Analysis:</strong> {editingAnalysis.title || 'Untitled Analysis'}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  <strong>Current Client:</strong> {editingAnalysis.tenant_name} (@{editingAnalysis.tenant_domain})
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select New Client/Tenant *
                </label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                >
                  <option value="">Select a client...</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name} (@{tenant.domain})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setEditingAnalysis(null);
                    setSelectedTenantId('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReassignTenant}
                  className="px-4 py-2 bg-[#17A2B8] text-white rounded-md hover:bg-[#138C9E] transition-colors flex items-center gap-2"
                >
                  <Save size={16} />
                  Reassign
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Analyses Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              All Analyses ({filteredAnalyses.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : filteredAnalyses.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'No analyses found matching your search' : 'No analyses found'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client/Tenant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Updated
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAnalyses.map((analysis) => {
                    const statusConfig = {
                      LIVE: { label: 'Live', className: 'bg-yellow-100 text-yellow-800' },
                      SAVED: { label: 'Saved', className: 'bg-blue-100 text-blue-800' },
                      LOCKED: { label: 'Locked', className: 'bg-green-100 text-green-800' },
                    };
                    const status = statusConfig[analysis.status] || statusConfig.SAVED;

                    return (
                      <tr key={analysis.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-900">
                              {analysis.title || 'Untitled Analysis'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Building2 className="h-5 w-5 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm text-gray-900">{analysis.tenant_name}</div>
                              <div className="text-xs text-gray-500">@{analysis.tenant_domain}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="h-5 w-5 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-500">
                              {analysis.created_by_email || analysis.created_by_username || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(analysis.updated_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => {
                              setEditingAnalysis(analysis);
                              setSelectedTenantId(analysis.tenant_id);
                            }}
                            className="text-[#17A2B8] hover:text-[#138C9E]"
                          >
                            Reassign
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-gray-900 mb-2 font-semibold">About Analysis Reassignment</h3>
          <ul className="text-gray-600 text-sm space-y-1 list-disc list-inside">
            <li>Reassigning an analysis moves it to a different client/tenant</li>
            <li>Users from the new tenant will be able to view and edit the analysis</li>
            <li>Users from the old tenant will lose access to the analysis</li>
            <li>All reassignments are logged in the audit log</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

