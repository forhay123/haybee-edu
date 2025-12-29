import React, { useState } from 'react';
import { WeeklyScheduleForm } from '../components/WeeklyScheduleForm';
import { WeeklySchedulesList } from '../components/WeeklySchedulesList';
import { WeeklyScheduleView } from '../components/WeeklyScheduleView';
import { Calendar, List, Grid3x3 } from 'lucide-react';

type TabView = 'create' | 'manage' | 'view';

export const ScheduleManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabView>('view');

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Weekly Schedule Management
        </h1>
        <p className="text-gray-600">
          Create weekly schedule templates, manage existing schedules, and view the timetable for all student types.
        </p>
      </div>

      <div className="bg-white border rounded-lg mb-6">
        <div className="flex border-b overflow-x-auto">
          <button
            onClick={() => setActiveTab('view')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'view'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Grid3x3 size={20} />
            <span>View Timetable</span>
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'create'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Calendar size={20} />
            <span>Create Schedule</span>
          </button>

          <button
            onClick={() => setActiveTab('manage')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'manage'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <List size={20} />
            <span>Manage Schedules</span>
          </button>
        </div>
      </div>

      <div>
        {activeTab === 'view' && (
          <div className="max-w-full">
            <WeeklyScheduleView />
          </div>
        )}

        {activeTab === 'create' && (
          <div className="max-w-3xl mx-auto">
            <WeeklyScheduleForm onSuccess={() => setActiveTab('view')} />
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="max-w-4xl mx-auto">
            <WeeklySchedulesList />
          </div>
        )}
      </div>
    </div>
  );
};