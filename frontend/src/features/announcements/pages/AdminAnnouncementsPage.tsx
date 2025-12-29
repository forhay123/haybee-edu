// frontend/src/features/announcements/pages/AdminAnnouncementsPage.tsx

import React, { useState, useEffect } from 'react';
import { useAnnouncements } from '../hooks/useAnnouncements';
import { announcementsApi } from '../api/announcementsApi';
import { AnnouncementForm } from '../components/AnnouncementForm';
import { SystemAlertForm } from '../components/SystemAlertForm';
import { AnnouncementList } from '../components/AnnouncementList';
import type { Announcement, CreateAnnouncementRequest, SystemAlertRequest } from '../types/announcementTypes';

export const AdminAnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const {
    loading: actionLoading,
    error,
    createAnnouncement,
    publishAnnouncement,
    sendSystemAlert,
    updateAnnouncement,
    deleteAnnouncement,
  } = useAnnouncements();

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const response = await announcementsApi.getAllAnnouncements(currentPage, 10);
      setAnnouncements(response.content);
      setTotalPages(response.totalPages);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, [currentPage]);

  const handleCreate = async (request: CreateAnnouncementRequest) => {
    try {
      console.log('📝 Creating announcement:', request);
      await createAnnouncement(request);
      setShowCreateForm(false);
      loadAnnouncements();
      alert('✅ Announcement created successfully!');
    } catch (err) {
      console.error('❌ Failed to create announcement:', err);
      alert('❌ Failed to create announcement. Check console for details.');
    }
  };

  const handleUpdate = async (request: CreateAnnouncementRequest) => {
    if (!editingAnnouncement) return;
    try {
      console.log('✏️ Updating announcement:', request);
      await updateAnnouncement(editingAnnouncement.id, request);
      setEditingAnnouncement(null);
      loadAnnouncements();
      alert('✅ Announcement updated successfully!');
    } catch (err) {
      console.error('❌ Failed to update announcement:', err);
      alert('❌ Failed to update announcement. Check console for details.');
    }
  };

  const handlePublish = async (id: number) => {
    if (confirm('Are you sure you want to publish this announcement?')) {
      try {
        console.log('📢 Publishing announcement:', id);
        await publishAnnouncement(id);
        loadAnnouncements();
        alert('✅ Announcement published successfully!');
      } catch (err) {
        console.error('❌ Failed to publish announcement:', err);
        alert('❌ Failed to publish announcement. Check console for details.');
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this announcement?')) {
      try {
        console.log('🗑️ Deleting announcement:', id);
        await deleteAnnouncement(id);
        loadAnnouncements();
        alert('✅ Announcement deleted successfully!');
      } catch (err) {
        console.error('❌ Failed to delete announcement:', err);
        alert('❌ Failed to delete announcement. Check console for details.');
      }
    }
  };

  const handleSendAlert = async (request: SystemAlertRequest) => {
    console.log('🚨 System Alert Request received:', request);
    
    // Confirm before sending
    const confirmed = confirm(
      `⚠️ CRITICAL ACTION ⚠️\n\n` +
      `This will send a HIGH PRIORITY alert to ALL USERS.\n\n` +
      `Title: ${request.title}\n` +
      `Message: ${request.message}\n\n` +
      `Are you absolutely sure you want to proceed?`
    );
    
    if (!confirmed) {
      console.log('❌ System alert cancelled by user');
      return;
    }
    
    try {
      console.log('🚀 Sending system alert...');
      const result = await sendSystemAlert(request);
      console.log('✅ System alert sent successfully:', result);
      
      setShowAlertForm(false);
      loadAnnouncements();
      
      alert('✅ System alert sent successfully to all users!');
    } catch (err: any) {
      console.error('❌ Failed to send system alert:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      
      const errorMessage = err.response?.data?.message || err.message || 'Unknown error';
      alert(`❌ Failed to send system alert:\n${errorMessage}\n\nCheck console for details.`);
    }
  };

  const handleEdit = (id: number) => {
    const announcement = announcements.find((a) => a.id === id);
    if (announcement) {
      setEditingAnnouncement(announcement);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Announcements Management</h1>
        <p className="text-gray-600">Create and manage announcements and system alerts</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">⚠️ {error}</p>
        </div>
      )}

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => {
            console.log('🎯 Opening create announcement form');
            setShowCreateForm(true);
            setShowAlertForm(false);
            setEditingAnnouncement(null);
          }}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          + Create Announcement
        </button>
        <button
          onClick={() => {
            console.log('🚨 Opening system alert form');
            setShowAlertForm(true);
            setShowCreateForm(false);
            setEditingAnnouncement(null);
          }}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          🚨 Send System Alert
        </button>
      </div>

      {showCreateForm && (
        <div className="mb-8 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Create New Announcement</h2>
          <AnnouncementForm
            onSubmit={handleCreate}
            onCancel={() => {
              console.log('❌ Cancelled create announcement');
              setShowCreateForm(false);
            }}
            loading={actionLoading}
          />
        </div>
      )}

      {showAlertForm && (
        <div className="mb-8 bg-white border border-red-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-red-800">Send System Alert</h2>
          <SystemAlertForm
            onSubmit={handleSendAlert}
            onCancel={() => {
              console.log('❌ Cancelled system alert');
              setShowAlertForm(false);
            }}
            loading={actionLoading}
          />
        </div>
      )}

      {editingAnnouncement && (
        <div className="mb-8 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Edit Announcement</h2>
          <AnnouncementForm
            onSubmit={handleUpdate}
            onCancel={() => {
              console.log('❌ Cancelled edit announcement');
              setEditingAnnouncement(null);
            }}
            initialData={{
              title: editingAnnouncement.title,
              message: editingAnnouncement.message,
              priority: editingAnnouncement.priority,
              targetAudience: editingAnnouncement.targetAudience,
              targetClassIds: editingAnnouncement.targetClassIds,
              targetUserIds: editingAnnouncement.targetUserIds,
              actionUrl: editingAnnouncement.actionUrl,
              expiresAt: editingAnnouncement.expiresAt,
              publishImmediately: false,
            }}
            loading={actionLoading}
          />
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="text-gray-500 mt-4">Loading announcements...</p>
        </div>
      ) : (
        <>
          <AnnouncementList
            announcements={announcements}
            onPublish={handlePublish}
            onEdit={handleEdit}
            onDelete={handleDelete}
            showActions={true}
          />

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-700">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage === totalPages - 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};