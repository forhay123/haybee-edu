// frontend/src/features/announcements/components/SystemAlertForm.tsx

import React, { useState } from 'react';
import type { SystemAlertRequest } from '../types/announcementTypes';

interface SystemAlertFormProps {
  onSubmit: (request: SystemAlertRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const SystemAlertForm: React.FC<SystemAlertFormProps> = ({
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<SystemAlertRequest>({
    title: '',
    message: '',
    actionUrl: '',
    expiresAt: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚨 System Alert Form Data:', formData);
    
    // Validation
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    
    if (!formData.message.trim()) {
      setError('Message is required');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Clean up the data before sending
      const cleanedData: SystemAlertRequest = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        actionUrl: formData.actionUrl?.trim() || undefined,
        expiresAt: formData.expiresAt || undefined,
      };
      
      console.log('🚀 Sending System Alert:', cleanedData);
      
      await onSubmit(cleanedData);
      
      console.log('✅ System Alert sent successfully');
      
      // Reset form
      setFormData({
        title: '',
        message: '',
        actionUrl: '',
        expiresAt: '',
      });
    } catch (err: any) {
      console.error('❌ System Alert Error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to send system alert');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null); // Clear error when user types
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-sm text-red-800">
          ⚠️ System alerts are sent to ALL users with HIGH priority. Use this feature carefully for critical announcements only.
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Alert Title *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          disabled={submitting || loading}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50 disabled:bg-gray-100"
          placeholder="Critical system alert"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700">
          Alert Message *
        </label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          required
          rows={4}
          disabled={submitting || loading}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50 disabled:bg-gray-100"
          placeholder="Describe the critical issue or announcement"
        />
      </div>

      <div>
        <label htmlFor="actionUrl" className="block text-sm font-medium text-gray-700">
          Action URL (Optional)
        </label>
        <input
          type="text"
          id="actionUrl"
          name="actionUrl"
          value={formData.actionUrl}
          onChange={handleChange}
          disabled={submitting || loading}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50 disabled:bg-gray-100"
          placeholder="/path/to/action"
        />
      </div>

      <div>
        <label htmlFor="expiresAt" className="block text-sm font-medium text-gray-700">
          Expires At (Optional)
        </label>
        <input
          type="datetime-local"
          id="expiresAt"
          name="expiresAt"
          value={formData.expiresAt}
          onChange={handleChange}
          disabled={submitting || loading}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50 disabled:bg-gray-100"
        />
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting || loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || loading}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {submitting || loading ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Sending...</span>
            </>
          ) : (
            '🚨 Send System Alert'
          )}
        </button>
      </div>
    </form>
  );
};