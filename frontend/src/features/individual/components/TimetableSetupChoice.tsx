// frontend/src/features/individual/components/TimetableSetupChoice.tsx

import React from 'react';
import { Upload, CheckSquare, Sparkles, Calendar } from 'lucide-react';

interface TimetableSetupChoiceProps {
  onChooseUpload: () => void;
  onChooseManual: () => void;
}

/**
 * Initial setup choice component
 * Shown to new students who haven't uploaded a timetable yet
 * Offers two paths: Upload timetable OR Manual subject selection
 */
const TimetableSetupChoice: React.FC<TimetableSetupChoiceProps> = ({
  onChooseUpload,
  onChooseManual,
}) => {
  return (
    <div className="min-h-[600px] flex items-center justify-center p-6">
      <div className="max-w-5xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-6">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Let's Set Up Your Learning Portal
          </h1>
          <p className="text-xl text-gray-600">
            Choose how you'd like to get started
          </p>
        </div>

        {/* Choice Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Option 1: Upload Timetable */}
          <button
            onClick={onChooseUpload}
            className="group relative bg-white rounded-2xl border-2 border-gray-200 hover:border-indigo-500 hover:shadow-xl transition-all duration-300 p-8 text-left overflow-hidden"
          >
            {/* Background gradient on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                  <Upload className="w-8 h-8 text-indigo-600" />
                </div>
                <span className="text-sm font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Recommended →
                </span>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Upload School Timetable
              </h3>

              <p className="text-gray-600 mb-6">
                Already have a timetable from your school? Upload it and let our AI extract everything automatically.
              </p>

              {/* Features */}
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span className="text-gray-700">
                    <strong>Automatic extraction</strong> - AI reads your timetable
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span className="text-gray-700">
                    <strong>Accurate scheduling</strong> - Uses your exact class times
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span className="text-gray-700">
                    <strong>Quick setup</strong> - Ready in 2-5 minutes
                  </span>
                </li>
              </ul>

              {/* Best for */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Best for:
                </p>
                <p className="text-sm text-gray-600">
                  Students with a physical or digital timetable from their school
                </p>
              </div>
            </div>
          </button>

          {/* Option 2: Choose Subjects Manually */}
          <button
            onClick={onChooseManual}
            className="group relative bg-white rounded-2xl border-2 border-gray-200 hover:border-purple-500 hover:shadow-xl transition-all duration-300 p-8 text-left overflow-hidden"
          >
            {/* Background gradient on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <CheckSquare className="w-8 h-8 text-purple-600" />
                </div>
                <span className="text-sm font-semibold text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Flexible →
                </span>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Choose My Subjects
              </h3>

              <p className="text-gray-600 mb-6">
                Don't have a timetable? No problem! Select the subjects you want to study and we'll create a schedule for you.
              </p>

              {/* Features */}
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span className="text-gray-700">
                    <strong>Full control</strong> - Pick exactly what you want
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span className="text-gray-700">
                    <strong>Instant setup</strong> - No file upload needed
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span className="text-gray-700">
                    <strong>Smart distribution</strong> - Balanced weekly schedule
                  </span>
                </li>
              </ul>

              {/* Best for */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Best for:
                </p>
                <p className="text-sm text-gray-600">
                  Self-learners, homeschoolers, or anyone wanting a custom schedule
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Info Footer */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>Don't worry!</strong> You can always change or update your schedule later
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimetableSetupChoice;