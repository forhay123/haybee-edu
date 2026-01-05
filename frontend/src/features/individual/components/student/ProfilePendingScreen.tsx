// frontend/src/features/individual/components/student/ProfilePendingScreen.tsx

import React from "react";
import { Clock, CheckCircle, AlertCircle, LogOut } from "lucide-react";
import { useAuth } from "../../../auth/useAuth";

interface ProfilePendingScreenProps {
  userEmail?: string;
}

const ProfilePendingScreen: React.FC<ProfilePendingScreenProps> = ({ userEmail }) => {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-10 text-white text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Clock className="w-10 h-10 text-white animate-pulse" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Thank You for Registering! 🎉
            </h1>
            <p className="text-indigo-100 text-lg">
              {userEmail || "Your account"}
            </p>
          </div>

          {/* Content */}
          <div className="px-8 py-10">
            <div className="space-y-6">
              {/* Status Message */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-amber-900 mb-2">
                      Profile Setup in Progress
                    </h3>
                    <p className="text-amber-800 text-sm">
                      Your student profile is currently being set up by our administrators. 
                      This process typically takes a few minutes to an hour.
                    </p>
                  </div>
                </div>
              </div>

              {/* What's Happening */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-lg">🔄</span>
                  What's Happening Right Now
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-900 font-medium">Account Created</p>
                      <p className="text-xs text-gray-600">Your account has been successfully registered</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5 animate-pulse">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-900 font-medium">Profile Setup (In Progress)</p>
                      <p className="text-xs text-gray-600">Admin is creating your student profile with proper class and department assignment</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-gray-400 text-xs">3</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Access Granted</p>
                      <p className="text-xs text-gray-500">You'll get full access to the learning portal once setup is complete</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  Next Steps
                </h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span><strong>Wait 1 hour:</strong> Profile setup is usually complete within this time</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span><strong>Log back in:</strong> Return to this page and sign in again</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span><strong>Start learning:</strong> Once approved, upload your timetable and begin!</span>
                  </li>
                </ul>
              </div>

              {/* Timeline */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-600" />
                  Estimated Timeline
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Typical Setup Time:</span>
                    <span className="font-semibold text-gray-900">5 - 60 minutes</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Check Back At:</span>
                    <span className="font-semibold text-indigo-600">
                      {new Date(Date.now() + 60 * 60 * 1000).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Need Help */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Need Help?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  If your profile is not ready after 1 hour, please contact your administrator or school support team.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                  >
                    Refresh Page
                  </button>
                  <button
                    onClick={logout}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>🔒 Your account is secure. You'll receive an email notification once your profile is ready.</p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePendingScreen;