import React, { useState } from 'react';
import { Plus, Edit2, Trash2, CheckCircle, Calendar, AlertCircle } from 'lucide-react';
import {
  useGetTerms,
  useGetActiveTerm,
  useCreateTerm,
  useUpdateTerm,
  useDeleteTerm,
  useSetActiveTerm,
  TermDto,
  TermResponseDto,
} from '../api/termsApi';

const TermsAdminPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<TermResponseDto | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Queries
  const { data: terms = [], isLoading } = useGetTerms();
  const { data: activeTerm } = useGetActiveTerm();

  // Mutations
  const createTerm = useCreateTerm();
  const updateTerm = useUpdateTerm();
  const deleteTerm = useDeleteTerm();
  const setActiveTerm = useSetActiveTerm();

  const handleOpenModal = (term?: TermResponseDto) => {
    setEditingTerm(term || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTerm(null);
  };

  const handleSetActive = (id: number) => {
    setActiveTerm.mutate(id);
  };

  const handleDelete = (id: number) => {
    deleteTerm.mutate(id, {
      onSuccess: () => setDeleteConfirm(null),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Term Management</h1>
              <p className="text-gray-600 mt-1">Manage academic terms and set active term</p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus size={20} />
              Add Term
            </button>
          </div>
        </div>

        {/* Active Term Banner */}
        {activeTerm && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-green-600" size={24} />
              <div>
                <h3 className="font-semibold text-green-900">Active Term: {activeTerm.name}</h3>
                <p className="text-green-700 text-sm">
                  {new Date(activeTerm.startDate).toLocaleDateString()} - {new Date(activeTerm.endDate).toLocaleDateString()} 
                  <span className="ml-2">• {activeTerm.weekCount} weeks</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Terms List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Term Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weeks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {terms.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <Calendar className="mx-auto mb-3 text-gray-400" size={48} />
                      <p className="text-lg font-medium">No terms created yet</p>
                      <p className="text-sm">Click "Add Term" to create your first term</p>
                    </td>
                  </tr>
                ) : (
                  terms.map((term) => (
                    <tr key={term.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {term.isActive && (
                            <CheckCircle className="text-green-600 mr-2" size={18} />
                          )}
                          <span className="font-medium text-gray-900">{term.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(term.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(term.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {term.weekCount} weeks
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {term.isActive ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {!term.isActive && (
                            <button
                              onClick={() => handleSetActive(term.id)}
                              className="text-green-600 hover:text-green-800 p-2 hover:bg-green-50 rounded"
                              title="Set as Active"
                            >
                              <CheckCircle size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenModal(term)}
                            className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          {deleteConfirm === term.id ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDelete(term.id)}
                                className="text-red-600 hover:text-red-800 text-xs font-medium"
                              >
                                Confirm?
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="text-gray-600 hover:text-gray-800 text-xs font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(term.id)}
                              className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete"
                              disabled={term.isActive}
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <TermModal
          term={editingTerm}
          onClose={handleCloseModal}
          onCreate={createTerm.mutate}
          onUpdate={updateTerm.mutate}
          isCreating={createTerm.isPending}
          isUpdating={updateTerm.isPending}
        />
      )}
    </div>
  );
};

// Term Modal Component
const TermModal = ({
  term,
  onClose,
  onCreate,
  onUpdate,
  isCreating,
  isUpdating,
}: {
  term: TermResponseDto | null;
  onClose: () => void;
  onCreate: (data: TermDto) => void;
  onUpdate: (data: { id: number; data: TermDto }) => void;
  isCreating: boolean;
  isUpdating: boolean;
}) => {
  const [formData, setFormData] = useState<TermDto>({
    name: term?.name || '',
    startDate: term?.startDate || '',
    endDate: term?.endDate || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Term name is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (formData.startDate && formData.endDate) {
      if (new Date(formData.endDate) <= new Date(formData.startDate)) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    if (term) {
      onUpdate(
        { id: term.id, data: formData },
        {
          onSuccess: onClose,
        }
      );
    } else {
      onCreate(formData, {
        onSuccess: onClose,
      });
    }
  };

  const handleChange = (field: keyof TermDto, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {term ? 'Edit Term' : 'Create New Term'}
          </h2>
        </div>

        <div className="p-6 space-y-4">
          {/* Term Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Term Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Fall 2024, Spring 2025"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.name}
              </p>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date *
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                errors.startDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.startDate}
              </p>
            )}
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date *
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => handleChange('endDate', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                errors.endDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.endDate && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.endDate}
              </p>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> The number of weeks will be automatically calculated based on the start and end dates.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              disabled={isCreating || isUpdating}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isCreating || isUpdating}
            >
              {isCreating || isUpdating ? 'Saving...' : term ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAdminPage;