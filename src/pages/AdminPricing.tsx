// Admin Pricing Management Page
// Only accessible to ADMIN role users

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getApiBaseUrl } from '../utils/apiConfig';

const API_BASE_URL = getApiBaseUrl();

interface PricingVersion {
  id: string;
  version: string;
  effective_date: string;
  is_active: boolean;
}

interface PricingEntry {
  id?: string;
  service_type: string;
  tier?: string;
  region?: string;
  unit_type: 'hourly' | 'gb_month' | 'gb' | 'percentage';
  unit_price: number;
  annual_multiplier: number;
  metadata?: Record<string, any>;
}

export default function AdminPricing() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<PricingVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<'AWS' | 'GCP' | 'Azure'>('AWS');
  const [pricingData, setPricingData] = useState<PricingEntry[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PricingEntry | null>(null);

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

    loadVersions();
  }, [user, isAuthenticated, navigate]);

  useEffect(() => {
    if (selectedVersion) {
      loadPricingData();
    }
  }, [selectedVersion, selectedProvider]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const loadVersions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/pricing/versions`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to load versions');

      const data = await response.json();
      setVersions(data.versions);
      
      // Select active version by default
      const activeVersion = data.versions.find((v: PricingVersion) => v.is_active);
      if (activeVersion) {
        setSelectedVersion(activeVersion.id);
      }
    } catch (error) {
      console.error('Load versions error:', error);
      toast.error('Failed to load pricing versions');
    }
  };

  const loadPricingData = async () => {
    if (!selectedVersion) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/pricing/${selectedVersion}/${selectedProvider}`,
        { headers: getAuthHeaders() }
      );

      if (!response.ok) throw new Error('Failed to load pricing data');

      const data = await response.json();
      setPricingData(data.pricing || []);
    } catch (error) {
      console.error('Load pricing error:', error);
      toast.error('Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEntry = async (entry: PricingEntry) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/pricing`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          pricing_version_id: selectedVersion,
          provider: selectedProvider,
          ...entry,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save pricing');
      }

      toast.success('Pricing entry saved successfully');
      setShowAddForm(false);
      setEditingEntry(null);
      loadPricingData();
    } catch (error) {
      console.error('Save pricing error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save pricing');
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pricing entry?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/admin/pricing/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to delete pricing');

      toast.success('Pricing entry deleted');
      loadPricingData();
    } catch (error) {
      console.error('Delete pricing error:', error);
      toast.error('Failed to delete pricing entry');
    }
  };

  const handleCreateVersion = async () => {
    const version = prompt('Enter version name (e.g., v1.0):');
    const date = prompt('Enter effective date (YYYY-MM-DD):');

    if (!version || !date) return;

    try {
      const response = await fetch(`${API_BASE_URL}/admin/pricing/versions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ version, effective_date: date }),
      });

      if (!response.ok) throw new Error('Failed to create version');

      toast.success('Pricing version created');
      loadVersions();
    } catch (error) {
      console.error('Create version error:', error);
      toast.error('Failed to create pricing version');
    }
  };

  if (user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pricing Management</h1>
          <p className="text-gray-600">Manage cloud provider pricing for AWS, GCP, and Azure</p>
        </div>

        {/* Version and Provider Selection */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pricing Version
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedVersion}
                  onChange={(e) => setSelectedVersion(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                >
                  <option value="">Select version...</option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.version} {v.is_active && '(Active)'}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleCreateVersion}
                  className="px-4 py-2 bg-[#17A2B8] text-white rounded-md hover:bg-[#138C9E] transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cloud Provider
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as 'AWS' | 'GCP' | 'Azure')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
              >
                <option value="AWS">AWS</option>
                <option value="GCP">GCP</option>
                <option value="Azure">Azure</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setEditingEntry(null);
                  setShowAddForm(true);
                }}
                disabled={!selectedVersion}
                className="w-full px-4 py-2 bg-[#17A2B8] text-white rounded-md hover:bg-[#138C9E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Add Pricing Entry
              </button>
            </div>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <PricingEntryForm
            entry={editingEntry}
            provider={selectedProvider}
            onSave={handleSaveEntry}
            onCancel={() => {
              setShowAddForm(false);
              setEditingEntry(null);
            }}
          />
        )}

        {/* Pricing Data Table */}
        {selectedVersion && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedProvider} Pricing Data
              </h2>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : pricingData.length === 0 ? (
              <div className="p-8 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No pricing data found</p>
                <p className="text-gray-400 text-sm mt-2">Click "Add Pricing Entry" to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Service Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Region
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Annual Multiplier
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pricingData.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {entry.service_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.tier || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.region || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.unit_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${entry.unit_price.toFixed(6)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.annual_multiplier}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingEntry(entry);
                                setShowAddForm(true);
                              }}
                              className="text-[#17A2B8] hover:text-[#138C9E]"
                            >
                              Edit
                            </button>
                            {entry.id && (
                              <button
                                onClick={() => handleDeleteEntry(entry.id!)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Pricing Entry Form Component
function PricingEntryForm({
  entry,
  provider,
  onSave,
  onCancel,
}: {
  entry: PricingEntry | null;
  provider: string;
  onSave: (entry: PricingEntry) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<PricingEntry>({
    service_type: entry?.service_type || '',
    tier: entry?.tier || '',
    region: entry?.region || '',
    unit_type: entry?.unit_type || 'hourly',
    unit_price: entry?.unit_price || 0,
    annual_multiplier: entry?.annual_multiplier || 1,
    metadata: entry?.metadata || {},
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border-2 border-[#17A2B8]">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {entry ? 'Edit' : 'Add'} Pricing Entry
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Type *
            </label>
            <input
              type="text"
              value={formData.service_type}
              onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
              placeholder="e.g., compute, storage, egress"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit Type *
            </label>
            <select
              value={formData.unit_type}
              onChange={(e) => setFormData({ ...formData, unit_type: e.target.value as any })}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
            >
              <option value="hourly">Hourly</option>
              <option value="gb_month">GB-Month</option>
              <option value="gb">GB</option>
              <option value="percentage">Percentage</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit Price *
            </label>
            <input
              type="number"
              step="0.000001"
              value={formData.unit_price}
              onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Annual Multiplier *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.annual_multiplier}
              onChange={(e) => setFormData({ ...formData, annual_multiplier: parseFloat(e.target.value) || 1 })}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
            />
            <p className="text-xs text-gray-500 mt-1">
              e.g., 8760 for hourly, 12 for monthly
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tier (optional)
            </label>
            <input
              type="text"
              value={formData.tier}
              onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
              placeholder="e.g., Standard, Premium"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Region (optional)
            </label>
            <input
              type="text"
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              placeholder="e.g., us-east-1"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-[#17A2B8] text-white rounded-md hover:bg-[#138C9E] transition-colors flex items-center gap-2"
          >
            <Save size={16} />
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

