import React, { useState } from 'react';
import { TargetAudience, type CreateAnnouncementRequest } from '../types/announcementTypes';

interface AnnouncementFormProps {
  onSubmit: (request: CreateAnnouncementRequest) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<CreateAnnouncementRequest>;
  loading?: boolean;
}

export const AnnouncementForm: React.FC<AnnouncementFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  loading = false,
}) => {
  const [formData, setFormData] = useState<CreateAnnouncementRequest>({
    title: initialData?.title || '',
    message: initialData?.message || '',
    priority: initialData?.priority || 'NORMAL', // ✅ Changed from enum to string
    targetAudience: initialData?.targetAudience || TargetAudience.ALL_USERS,
    targetClassIds: initialData?.targetClassIds || [],
    targetUserIds: initialData?.targetUserIds || [],
    actionUrl: initialData?.actionUrl || '',
    expiresAt: initialData?.expiresAt || '',
    publishImmediately: initialData?.publishImmediately || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title *</label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Enter announcement title"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message *</label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          required
          rows={4}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Enter announcement message"
        />
      </div>

      <div>
        <label htmlFor="priority" className="block text-sm font-medium text-gray-700">Priority *</label>
        <select
          id="priority"
          name="priority"
          value={formData.priority}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="LOW">Low</option>
          <option value="NORMAL">Normal</option>
          <option value="HIGH">High</option>
        </select>
      </div>

      <div>
        <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-700">Target Audience *</label>
        <select
          id="targetAudience"
          name="targetAudience"
          value={formData.targetAudience}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value={TargetAudience.ALL_USERS}>All Users</option>
          <option value={TargetAudience.ALL_STUDENTS}>All Students</option>
          <option value={TargetAudience.ALL_TEACHERS}>All Teachers</option>
          <option value={TargetAudience.SPECIFIC_CLASSES}>Specific Classes</option>
          <option value={TargetAudience.SPECIFIC_USERS}>Specific Users</option>
        </select>
      </div>

      <div>
        <label htmlFor="actionUrl" className="block text-sm font-medium text-gray-700">Action URL (Optional)</label>
        <input
          type="text"
          id="actionUrl"
          name="actionUrl"
          value={formData.actionUrl}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="/path/to/action"
        />
      </div>

      <div>
        <label htmlFor="expiresAt" className="block text-sm font-medium text-gray-700">Expires At (Optional)</label>
        <input
          type="datetime-local"
          id="expiresAt"
          name="expiresAt"
          value={formData.expiresAt}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="publishImmediately"
          name="publishImmediately"
          checked={formData.publishImmediately}
          onChange={handleChange}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="publishImmediately" className="ml-2 block text-sm text-gray-700">
          Publish Immediately
        </label>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : formData.publishImmediately ? 'Create & Publish' : 'Create Draft'}
        </button>
      </div>
    </form>
  );
};