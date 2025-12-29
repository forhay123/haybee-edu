// ===== src/features/videos/pages/VideoLibraryPage.tsx =====
import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";

import {
  useTeacherSubjects,
  useGetStudentSubjects,
  useGetSubjects
} from "@/features/subjects/hooks/useSubjects";

import { useMyProfile } from "../../studentProfiles/hooks/useStudentProfiles";
import { useVideos } from "../hooks/useVideoLessons";

import { Video, Search, Clock, Eye, Upload, TrendingUp, CheckCircle, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import type { VideoLessonDto } from "../api/videosApi";

// ✅ Helper function to format duration
const formatDuration = (seconds: number | undefined | null): string => {
  if (!seconds || isNaN(seconds) || seconds === 0) {
    return "Processing...";
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const VideoLibraryPage: React.FC = () => {
  const { user } = useAuth();

  const isTeacher = user?.roles?.includes("TEACHER");
  const isAdmin = user?.roles?.includes("ADMIN");
  const isStudent = user?.roles?.includes("STUDENT");

  const [expandedSections, setExpandedSections] = useState<{
    SCHOOL: boolean;
    HOME: boolean;
    ASPIRANT: boolean;
  }>({
    SCHOOL: false,
    HOME: false,
    ASPIRANT: false,
  });

  // ✅ Only fetch student profile if user is actually a student
  const { data: profile } = useMyProfile({
    enabled: isStudent,
  });

  const classId = profile?.classId ?? null;
  const departmentId = profile?.departmentId ?? null;
  const studentType = profile?.studentType ?? null;

  // ===== FETCH SUBJECTS BASED ON ROLE =====
  const { data: teacherSubjects } = useTeacherSubjects({
    enabled: isTeacher,
  });

  const { data: adminSubjects } = useGetSubjects({
    enabled: isAdmin,
  });

  // For students - fetch their actual subjects
  const { data: studentSubjects } = useGetStudentSubjects(
    classId,
    departmentId,
    studentType,
    {
      enabled: isStudent && !!classId && studentType !== 'ASPIRANT', // ✅ Don't fetch for ASPIRANT
    }
  );

  // ✅ Get the final subject list based on role
  const subjects = useMemo(() => {
    if (isTeacher) return teacherSubjects || [];
    if (isAdmin) return adminSubjects || [];
    if (isStudent) {
      // ✅ ASPIRANT students have subjects in their profile
      if (studentType === 'ASPIRANT' && profile?.subjects) {
        return profile.subjects;
      }
      // ✅ REGULAR students get subjects from class
      return studentSubjects || [];
    }
    return [];
  }, [
    isTeacher,
    isAdmin,
    isStudent,
    studentType,
    teacherSubjects,
    adminSubjects,
    studentSubjects,
    profile?.subjects,
  ]);

  // ✅ Extract student's subject IDs
  const studentSubjectIds = useMemo(() => {
    if (!isStudent) return new Set<number>();
    return new Set(subjects.map(s => s.id));
  }, [isStudent, subjects]);

  // ✅ Check if student is ASPIRANT
  const isAspirantStudent = useMemo(() => {
    return isStudent && studentType === 'ASPIRANT';
  }, [isStudent, studentType]);

  // ✅ CRITICAL FIX: Segment subjects (and their videos) by student type
  const subjectIdsByType = useMemo(() => {
    if (!isTeacher && !isAdmin) return null;

    const allSubjects = adminSubjects || teacherSubjects || [];
    
    if (!allSubjects || allSubjects.length === 0) {
      return {
        SCHOOL: new Set<number>(),
        HOME: new Set<number>(),
        ASPIRANT: new Set<number>(),
      };
    }

    const schoolSubjects = new Set<number>();
    const homeSubjects = new Set<number>();
    const aspirantSubjects = new Set<number>();

    allSubjects.forEach(subject => {
      const subjectName = subject.name || "";
      
      if (subjectName.includes("ASPIRANT")) {
        aspirantSubjects.add(subject.id);
      }
      else if (subjectName.includes("HOME")) {
        homeSubjects.add(subject.id);
      }
      else {
        schoolSubjects.add(subject.id);
      }
    });

    console.log("📊 Subject categorization:");
    console.log("  SCHOOL subjects:", schoolSubjects.size);
    console.log("  HOME subjects:", homeSubjects.size);
    console.log("  ASPIRANT subjects:", aspirantSubjects.size);

    return {
      SCHOOL: schoolSubjects,
      HOME: homeSubjects,
      ASPIRANT: aspirantSubjects,
    };
  }, [isTeacher, isAdmin, adminSubjects, teacherSubjects]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<number | undefined>();
  const [filterStatus, setFilterStatus] = useState("all");

  // ✅ FIXED: For students, only fetch if we have their profile
  const {
    data: videos = [],
    isLoading,
    isError,
    error,
  } = useVideos({
    subjectId: selectedSubject,
    status: filterStatus !== "all" ? filterStatus : undefined,
    // ✅ Only enable for teachers/admins or when student profile is loaded
    enabled: isTeacher || isAdmin || (isStudent && !!profile?.id),
  });

  // ✅ CRITICAL FIX: Filter videos for students
  const accessibleVideos = useMemo(() => {
    if (isTeacher || isAdmin) return videos;
    
    if (isStudent) {
      // ✅ ASPIRANT students: Backend already filtered correctly
      // They get: enrolled subjects + ALL aspirant-flagged videos
      // So we just need to filter for published status
      if (isAspirantStudent) {
        console.log("🎯 ASPIRANT student - videos from backend:", videos.length);
        return videos.filter(video => 
          video &&
          video.status === 'PUBLISHED' &&
          video.published === true
        );
      }
      
      // ✅ REGULAR students: Filter by enrolled subjects only
      console.log("📚 REGULAR student - filtering by enrolled subjects");
      return videos.filter(video => 
        video &&
        video.subjectId != null &&
        studentSubjectIds.has(video.subjectId) && 
        video.status === 'PUBLISHED' &&
        video.published === true
      );
    }
    
    return videos;
  }, [videos, isStudent, isAspirantStudent, isTeacher, isAdmin, studentSubjectIds]);

  // ✅ Apply search filter
  const filteredVideos = useMemo(() => {
    if (!searchQuery) return accessibleVideos;

    const q = searchQuery.toLowerCase();
    return accessibleVideos.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.description?.toLowerCase().includes(q)
    );
  }, [accessibleVideos, searchQuery]);

  // ✅ CORRECTED: Segment videos by actual student type from filtered videos
  const segmentedVideos = useMemo(() => {
    if (!isTeacher && !isAdmin || !subjectIdsByType) return null;

    // Sort by upload date (newest first)
    const sortByDate = (videos: VideoLessonDto[]) => 
      videos.sort((a, b) => 
        new Date(b.uploadDate || 0).getTime() - new Date(a.uploadDate || 0).getTime()
      );

    // Filter videos by which subjects each student type has access to
    const schoolVideos = filteredVideos.filter(v => 
      v.subjectId && subjectIdsByType.SCHOOL.has(v.subjectId)
    );

    const homeVideos = filteredVideos.filter(v => 
      v.subjectId && subjectIdsByType.HOME.has(v.subjectId)
    );

    const aspirantVideos = filteredVideos.filter(v => 
      v.subjectId && subjectIdsByType.ASPIRANT.has(v.subjectId)
    );

    console.log("📺 Segmented Videos - SCHOOL:", schoolVideos.length, "HOME:", homeVideos.length, "ASPIRANT:", aspirantVideos.length);

    return {
      SCHOOL: sortByDate([...schoolVideos]),
      HOME: sortByDate([...homeVideos]),
      ASPIRANT: sortByDate([...aspirantVideos]),
    };
  }, [filteredVideos, isTeacher, isAdmin, subjectIdsByType]);

  const toggleSection = (section: 'SCHOOL' | 'HOME' | 'ASPIRANT') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Render video card component
  const renderVideoCard = (video: VideoLessonDto) => (
    <Link
      key={video.id}
      to={
        isTeacher || isAdmin 
          ? `/teacher/videos/${video.id}` 
          : `/videos/${video.id}/details`
      }
      className="bg-white border rounded-lg shadow-sm hover:shadow-xl transition overflow-hidden group"
    >
      <div className="relative aspect-video bg-gray-100">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
            <Video className="w-16 h-16 text-purple-400" />
          </div>
        )}

        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
          {formatDuration(video.durationSeconds)}
        </div>

        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {video.status && video.status !== "PUBLISHED" && (
            <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
              video.status === "PROCESSING" ? "bg-blue-500 text-white" :
              video.status === "FAILED" ? "bg-red-500 text-white" :
              video.status === "PENDING" ? "bg-orange-500 text-white" :
              "bg-yellow-500 text-white"
            }`}>
              {video.status === "PROCESSING" && <Clock className="w-3 h-3 animate-spin" />}
              {video.status}
            </span>
          )}
          
          {(isTeacher || isAdmin) && video.status === "PUBLISHED" && (
            <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 shadow-md ${
              video.published 
                ? "bg-green-500 text-white" 
                : "bg-orange-500 text-white animate-pulse"
            }`}>
              {video.published ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  Live
                </>
              ) : (
                <>
                  <EyeOff className="w-3 h-3" />
                  Draft
                </>
              )}
            </span>
          )}
          
          {/* ✅ Show ASPIRANT badge on aspirant videos */}
          {isStudent && video.isAspirantMaterial && (
            <span className="px-2 py-1 rounded text-xs font-bold bg-purple-500 text-white flex items-center gap-1">
              🎯 ASPIRANT
            </span>
          )}
        </div>

        {isStudent && video.completed && (
          <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Watched
          </div>
        )}

        {isStudent && 
          video.completionPercentage !== undefined && 
          video.completionPercentage > 0 && 
          !video.completed && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700 bg-opacity-50">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${video.completionPercentage}%` }}
            />
          </div>
        )}
      </div>

      <div className="p-4">
        <h2 className="font-bold text-gray-900 line-clamp-2 mb-2 group-hover:text-purple-600 transition">
          {video.title}
        </h2>

        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span className="text-purple-600 font-medium">
            {video.subjectName || 'No Subject'}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {formatDuration(video.durationSeconds)}
          </span>
        </div>

        {isAdmin && video.teacherName && (
          <p className="text-xs text-purple-600 font-medium mt-2 flex items-center gap-1">
            👤 {video.teacherName}
          </p>
        )}

        {video.description && (
          <p className="text-xs text-gray-500 mt-2 line-clamp-2">{video.description}</p>
        )}

        {(isTeacher || isAdmin) && video.status === "PUBLISHED" && (
          <div className={`mt-2 px-2 py-1 rounded text-xs font-medium ${
            video.published 
              ? "bg-green-50 text-green-700 border border-green-200" 
              : "bg-orange-50 text-orange-700 border border-orange-200"
          }`}>
            {video.published ? (
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Published - Visible to students
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <EyeOff className="w-3 h-3" />
                Unpublished - Click to publish
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            {isStudent ? (
              <>
                <CheckCircle className="w-3 h-3" />
                {video.completed ? 'Watched' : 'Not watched'}
              </>
            ) : (
              <>
                <Eye className="w-3 h-3" />
                {video.totalViews || 0} views
              </>
            )}
          </div>

          {isStudent && 
            video.completionPercentage !== undefined && 
            video.completionPercentage > 0 && (
            <span className="text-xs font-medium text-blue-600">
              {Math.round(video.completionPercentage)}% complete
            </span>
          )}
        </div>

        {(isTeacher || isAdmin) && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400 italic">
              {video.status === "PUBLISHED" && !video.published 
                ? "📝 Click to publish this video" 
                : video.status === "PUBLISHED" 
                ? "Click to view analytics" 
                : "Click to manage video"}
            </p>
          </div>
        )}
      </div>
    </Link>
  );

  // Render student type section
  const renderStudentTypeSection = (
    type: 'SCHOOL' | 'HOME' | 'ASPIRANT',
    videos: VideoLessonDto[],
    color: string,
    icon: string
  ) => {
    const displayVideos = expandedSections[type] ? videos : videos.slice(0, 3);
    const hasMore = videos.length > 3;

    // Don't render empty sections
    if (videos.length === 0) {
      return (
        <div className="space-y-4">
          <h2 className={`text-2xl font-bold flex items-center gap-2 ${color}`}>
            <span className="text-2xl">{icon}</span>
            {type} Student Videos
          </h2>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <Video className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No videos for {type} students yet</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className={`text-2xl font-bold flex items-center gap-2 ${color}`}>
            <span className="text-2xl">{icon}</span>
            {type} Student Videos
            <span className="text-sm font-normal text-gray-500">
              ({videos.length} {videos.length === 1 ? 'video' : 'videos'})
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayVideos.map(renderVideoCard)}
        </div>

        {hasMore && (
          <div className="flex justify-center">
            <button
              onClick={() => toggleSection(type)}
              className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition ${
                expandedSections[type]
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : `${color.replace('text-', 'bg-').replace('-600', '-500')} text-white hover:opacity-90`
              }`}
            >
              {expandedSections[type] ? (
                <>
                  Show Less
                  <ChevronUp className="w-5 h-5" />
                </>
              ) : (
                <>
                  Show All {videos.length} Videos
                  <ChevronDown className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  // --------------- UI -------------------

  if (!user) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 font-medium">You are not logged in.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center h-48">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading videos...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <p className="text-red-600 font-medium">Error loading videos</p>
          <p className="text-red-500 text-sm mt-1">
            {error instanceof Error ? error.message : "Something went wrong"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border">
        <div className="flex justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Video className="w-8 h-8 text-purple-600" />
              Video Library
              {isAdmin && (
                <span className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full ml-2">
                  Admin - All Videos
                </span>
              )}
              {isTeacher && (
                <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full ml-2">
                  Teacher Portal
                </span>
              )}
              {/* ✅ Show ASPIRANT badge for aspirant students */}
              {isAspirantStudent && (
                <span className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full ml-2">
                  🎯 ASPIRANT Student
                </span>
              )}
            </h1>

            <p className="text-gray-600 mt-1">
              {isTeacher
                ? "Your videos segmented by student type (based on subject names)"
                : isAdmin
                ? "View all videos from all teachers"
                : isAspirantStudent
                ? "Watch video lessons from your enrolled subjects + bonus ASPIRANT content"
                : "Watch video lessons for your enrolled subjects"}
            </p>
          </div>

          {(isTeacher || isAdmin) && (
            <div className="flex gap-3">
              <Link
                to="/videos/upload"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
              >
                <Upload className="w-5 h-5" />
                Upload Video
              </Link>

              {isTeacher && (
                <Link
                  to="/videos/analytics"
                  className="px-6 py-3 bg-white border rounded-lg flex items-center gap-2 hover:bg-gray-50 transition"
                >
                  <TrendingUp className="w-5 h-5" />
                  Analytics
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border p-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              className="pl-10 w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search videos..."
            />
          </div>

          <select
            value={selectedSubject ?? ""}
            onChange={(e) =>
              setSelectedSubject(e.target.value ? Number(e.target.value) : undefined)
            }
            className="border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">
              {isStudent ? "All My Subjects" : "All Subjects"}
            </option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>

          {(isTeacher || isAdmin) && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="PROCESSING">Processing</option>
              <option value="PENDING">Pending</option>
              <option value="DRAFT">Draft</option>
              <option value="FAILED">Failed</option>
            </select>
          )}
        </div>
      </div>

      {/* ✅ SEGMENTED VIEW FOR TEACHERS/ADMINS */}
      {(isTeacher || isAdmin) && segmentedVideos && (
        <div className="space-y-8">
          {renderStudentTypeSection('SCHOOL', segmentedVideos.SCHOOL, 'text-blue-600', '🏫')}
          {renderStudentTypeSection('HOME', segmentedVideos.HOME, 'text-green-600', '🏠')}
          {renderStudentTypeSection('ASPIRANT', segmentedVideos.ASPIRANT, 'text-purple-600', '🎯')}
        </div>
      )}

      {/* ✅ REGULAR VIEW FOR STUDENTS */}
      {isStudent && (
        <>
          <div className="text-sm text-gray-600">
            Showing {filteredVideos.length} {filteredVideos.length === 1 ? 'video' : 'videos'}
            {/* ✅ Show enrolled subjects count if available */}
            {subjects.length > 0 && (
              <>
                {' for your '}
                <span className="font-semibold text-purple-600">
                  {subjects.length} enrolled subject{subjects.length === 1 ? '' : 's'}
                </span>
              </>
            )}
            {isAspirantStudent && filteredVideos.length > 0 && (
              <span className="text-purple-600 font-medium"> (including bonus ASPIRANT content)</span>
            )}
          </div>

          {/* ✅ FIXED: Only show warning when actually no subjects */}
          {subjects.length === 0 && filteredVideos.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 font-medium">
                {isAspirantStudent 
                  ? "You haven't enrolled in any subjects yet."
                  : "You are not enrolled in any subjects yet."
                }
              </p>
              <p className="text-yellow-700 text-sm mt-1">
                {isAspirantStudent
                  ? "Visit the Subjects page to enroll in SSS3 subjects. You'll also see bonus ASPIRANT content!"
                  : "Contact your teacher or administrator to get enrolled in subjects."
                }
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {subjects.length === 0 ? "No subjects enrolled yet" : "No videos found"}
                </p>
              </div>
            ) : (
              filteredVideos.map(renderVideoCard)
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default VideoLibraryPage;