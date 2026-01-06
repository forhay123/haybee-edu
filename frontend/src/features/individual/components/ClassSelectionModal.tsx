// frontend/src/features/individual/components/ClassSelectionModal.tsx

import React, { useState, useMemo } from 'react';
import { X, Search, Check, AlertCircle, Loader2, GraduationCap } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../../../../api/axios';
import { toast } from 'react-hot-toast';

interface ClassOption {
  id: number;
  name: string;
  grade?: string;
  departmentId: number;
  departmentName?: string;
}

interface ClassSelectionModalProps {
  studentProfileId: number;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

/**
 * Modal for selecting class before timetable setup
 * Students must select their class before they can proceed
 */
const ClassSelectionModal: React.FC<ClassSelectionModalProps> = ({
  studentProfileId,
  onClose,
  onSuccess,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // Fetch available classes
  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ['available-classes'],
    queryFn: async () => {
      const response = await axios.get('/classes');
      return response.data as ClassOption[];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Mutation to update student's class
  const updateClassMutation = useMutation({
    mutationFn: async (classId: number) => {
      const response = await axios.patch(`/student-profiles/${studentProfileId}`, {
        classId,
      });
      return response.data;
    },
    onSuccess: async () => {
      toast.success('✅ Class assigned successfully!');
      
      // Invalidate queries to refetch profile data
      await queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      await queryClient.invalidateQueries({ queryKey: ['student-profile', studentProfileId] });
      
      // Wait a bit for the queries to refetch
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Call onSuccess callback (can be async)
      await Promise.resolve(onSuccess());
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to assign class';
      toast.error(`❌ ${message}`);
    },
  });

  // Filter classes by search query
  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return classes;
    const query = searchQuery.toLowerCase();
    return classes.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.grade?.toLowerCase().includes(query) ||
        c.departmentName?.toLowerCase().includes(query)
    );
  }, [classes, searchQuery]);

  // Group classes by department or grade
  const groupedClasses = useMemo(() => {
    const groups: Record<string, ClassOption[]> = {};
    
    filteredClasses.forEach((classOption) => {
      const groupKey = classOption.departmentName || classOption.grade || 'Other';
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(classOption);
    });

    return groups;
  }, [filteredClasses]);

  const handleAssignClass = async () => {
    if (!selectedClassId) {
      toast.error('Please select a class');
      return;
    }

    try {
      await updateClassMutation.mutateAsync(selectedClassId);
    } catch (error) {
      // Error handled in mutation
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white px-6 py-5 border-b border-gray-200 rounded-t-2xl z-10">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Select Your Class</h2>
              <p className="text-sm text-gray-600 mt-1">
                Choose the class you belong to before setting up your timetable
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingClasses ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <span className="ml-3 text-gray-600">Loading classes...</span>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? 'No classes found' : 'No classes available'}
              </h3>
              <p className="text-gray-600">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Please contact an administrator to set up classes'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedClasses).map(([groupName, groupClasses]) => (
                <div key={groupName}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                    {groupName}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupClasses.map((classOption) => {
                      const isSelected = selectedClassId === classOption.id;

                      return (
                        <button
                          key={classOption.id}
                          onClick={() => setSelectedClassId(classOption.id)}
                          className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
                          }`}
                        >
                          {/* Checkmark */}
                          {isSelected && (
                            <div className="absolute top-3 right-3 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}

                          {/* Class Info */}
                          <div className="pr-8">
                            <div className="flex items-center gap-2 mb-2">
                              <GraduationCap className="w-5 h-5 text-indigo-600" />
                              <h4 className="font-semibold text-gray-900">
                                {classOption.name}
                              </h4>
                            </div>
                            {classOption.grade && (
                              <p className="text-sm text-gray-600">
                                Grade: {classOption.grade}
                              </p>
                            )}
                            {classOption.departmentName && (
                              <p className="text-xs text-gray-500 mt-1">
                                {classOption.departmentName}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white px-6 py-5 border-t border-gray-200 rounded-b-2xl">
          {/* Info Message */}
          {!selectedClassId && (
            <div className="mb-4 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Your class determines which subjects are available to you. Make sure to select the correct class.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>

            <button
              onClick={handleAssignClass}
              disabled={!selectedClassId || updateClassMutation.isPending}
              className={`px-8 py-2.5 rounded-lg font-semibold transition-all ${
                selectedClassId && !updateClassMutation.isPending
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/30'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {updateClassMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Assigning...
                </span>
              ) : (
                'Continue'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassSelectionModal;