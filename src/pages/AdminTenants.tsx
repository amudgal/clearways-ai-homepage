// Admin Tenant Management Page
// Only accessible to ADMIN role users

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, X, AlertCircle, Building2, Users, FileText } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
  user_count?: number;
  analysis_count?: number;
}

export default function AdminTenants() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

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

    loadTenants();
  }, [user, isAuthenticated, navigate]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const loadTenants = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTenant = async (tenantData: { name: string; domain: string; status?: string }) => {
    try {
      const url = editingTenant
        ? `${API_BASE_URL}/admin/tenants/${editingTenant.id}`
        : `${API_BASE_URL}/admin/tenants`;
      
      const method = editingTenant ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(tenantData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save tenant');
      }

      toast.success(`Tenant ${editingTenant ? 'updated' : 'created'} successfully`);
      setShowAddForm(false);
      setEditingTenant(null);
      loadTenants();
    } catch (error) {
      console.error('Save tenant error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save tenant');
    }
  };

  const handleDeleteTenant = async (id: string, domain: string) => {
    if (domain === 'clearways.ai') {
      toast.error('Cannot delete ClearWays AI tenant');
      return;
    }

    if (!confirm(`Are you sure you want to deactivate tenant "${domain}"? This will prevent new logins from this domain.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/tenants/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to delete tenant');

      toast.success('Tenant deactivated successfully');
      loadTenants();
    } catch (error) {
      console.error('Delete tenant error:', error);
      toast.error('Failed to deactivate tenant');
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tenant Management</h1>
          <p className="text-gray-600">Manage client tenants and email domain mappings</p>
        </div>

        {/* Add Tenant Button */}
        <div className="mb-6">
          <button
            onClick={() => {
              setEditingTenant(null);
              setShowAddForm(true);
            }}
            className="inline-flex items-center gap-2 bg-[#17A2B8] text-white px-6 py-3 rounded-lg hover:bg-[#138C9E] transition-colors shadow-sm"
          >
            <Plus size={20} />
            Onboard New Client
          </button>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <TenantForm
            tenant={editingTenant}
            onSave={handleSaveTenant}
            onCancel={() => {
              setShowAddForm(false);
              setEditingTenant(null);
            }}
          />
        )}

        {/* Tenants Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Client Tenants</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : tenants.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No tenants found</p>
              <p className="text-gray-400 text-sm mt-2">Click "Onboard New Client" to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email Domain
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Users
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Analyses
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">{tenant.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">@{tenant.domain}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            tenant.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {tenant.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <Users className="h-4 w-4 mr-1" />
                          {tenant.user_count || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <FileText className="h-4 w-4 mr-1" />
                          {tenant.analysis_count || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(tenant.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingTenant(tenant);
                              setShowAddForm(true);
                            }}
                            className="text-[#17A2B8] hover:text-[#138C9E]"
                          >
                            Edit
                          </button>
                          {tenant.domain !== 'clearways.ai' && (
                            <button
                              onClick={() => handleDeleteTenant(tenant.id, tenant.domain)}
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

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-gray-900 mb-2 font-semibold">About Tenant Management</h3>
          <ul className="text-gray-600 text-sm space-y-1 list-disc list-inside">
            <li>Each tenant represents a client organization</li>
            <li>Users with emails from the tenant's domain will automatically be assigned to that tenant</li>
            <li>Users can only see analyses from their own tenant (except admins)</li>
            <li>Deactivating a tenant prevents new logins from that domain</li>
            <li>ClearWays AI tenant cannot be deleted</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Tenant Form Component
function TenantForm({
  tenant,
  onSave,
  onCancel,
}: {
  tenant: Tenant | null;
  onSave: (data: { name: string; domain: string; status?: string }) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: tenant?.name || '',
    domain: tenant?.domain || '',
    status: tenant?.status || 'ACTIVE',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.domain) {
      toast.error('Name and domain are required');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border-2 border-[#17A2B8]">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {tenant ? 'Edit' : 'Onboard New'} Client Tenant
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., American Express"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Domain *
            </label>
            <div className="flex items-center">
              <span className="text-gray-500 mr-2">@</span>
              <input
                type="text"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value.toLowerCase() })}
                placeholder="aexp.com"
                required
                disabled={!!tenant}
                className={`w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#17A2B8] ${
                  tenant ? 'bg-gray-100' : ''
                }`}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {tenant ? 'Domain cannot be changed after creation' : 'Users with this email domain will be assigned to this tenant'}
            </p>
          </div>

          {tenant && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          )}
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
            {tenant ? 'Update' : 'Create'} Tenant
          </button>
        </div>
      </form>
    </div>
  );
}

