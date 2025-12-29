// frontend/src/features/individual/pages/admin/AdminStudentScheduleListPage.tsx

import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomBadge as Badge } from "@/components/ui/custom-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calendar,
  Search,
  RefreshCw,
  AlertCircle,
  Eye,
  Users,
  Filter,
} from "lucide-react";
import axios from "../../../../api/axios";
import { adminTimetableApi } from "../../api/individualApi";

interface StudentProfile {
  id: number;
  userId: number;
  fullName: string;
  email?: string;
  studentType: string;
  classId: number;
  className: string;
  departmentId: number;
  departmentName: string;
  subjectIds: number[];
  subjectNames: string[];
  chosenLanguage?: string;
}

interface Timetable {
  id: number;
  studentProfileId: number;
  processingStatus: string;
  uploadedAt: string;
  originalFilename: string;
}

interface EnrichedStudent extends StudentProfile {
  hasTimetable: boolean;
  latestTimetableId?: number;
  latestTimetableStatus?: string;
  timetableCount: number;
}

const AdminStudentScheduleListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all students
  const { 
    data: students = [], 
    isLoading: studentsLoading, 
    error: studentsError, 
    refetch: refetchStudents 
  } = useQuery<StudentProfile[]>({
    queryKey: ["student-profiles", "all"],
    queryFn: async () => {
      const res = await axios.get("/student-profiles");
      return res.data;
    },
    staleTime: 30000,
  });

  // Fetch all timetables (admin endpoint)
  const { 
    data: timetables = [], 
    isLoading: timetablesLoading,
    refetch: refetchTimetables 
  } = useQuery<Timetable[]>({
    queryKey: ["admin-timetables", "all"],
    queryFn: () => adminTimetableApi.getAllTimetables(),
    staleTime: 30000,
  });

  // ✅ FILTER: Only INDIVIDUAL students
  const individualStudents = useMemo(() => {
    return students.filter(s => s.studentType === "INDIVIDUAL");
  }, [students]);

  // Enrich students with timetable information
  const enrichedStudents: EnrichedStudent[] = useMemo(() => {
    // Group timetables by student profile ID
    const timetablesByStudent = new Map<number, Timetable[]>();
    
    timetables.forEach((tt) => {
      if (!timetablesByStudent.has(tt.studentProfileId)) {
        timetablesByStudent.set(tt.studentProfileId, []);
      }
      timetablesByStudent.get(tt.studentProfileId)!.push(tt);
    });

    return individualStudents.map((student) => {
      const studentTimetables = timetablesByStudent.get(student.id) || [];
      
      // Sort by upload date to get the latest
      const sortedTimetables = [...studentTimetables].sort(
        (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
      
      const latestTimetable = sortedTimetables[0];

      return {
        ...student,
        hasTimetable: studentTimetables.length > 0,
        latestTimetableId: latestTimetable?.id,
        latestTimetableStatus: latestTimetable?.processingStatus,
        timetableCount: studentTimetables.length,
      };
    });
  }, [individualStudents, timetables]);

  // Filter students based on search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return enrichedStudents;

    const query = searchQuery.toLowerCase();
    return enrichedStudents.filter((student) => {
      const fullName = student.fullName?.toLowerCase() ?? "";
      const className = student.className?.toLowerCase() ?? "";
      const email = student.email?.toLowerCase() ?? "";

      return (
        fullName.includes(query) ||
        className.includes(query) ||
        email.includes(query)
      );
    });
  }, [enrichedStudents, searchQuery]);

  // Calculate statistics
  const studentsWithTimetables = enrichedStudents.filter((s) => s.hasTimetable).length;

  // Helper to get initials from full name
  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
    }
    return parts[0]?.charAt(0) ?? "?";
  };

  // Handle navigation to student schedule
  const handleViewSchedule = (student: EnrichedStudent) => {
    if (student.latestTimetableId) {
      // Navigate to the timetable detail page
      navigate(`/admin/individual/timetables/${student.latestTimetableId}`);
    } else {
      // Navigate to a page where they can upload a timetable
      navigate(`/admin/individual/schedules/${student.id}`);
    }
  };

  const isLoading = studentsLoading || timetablesLoading;
  const error = studentsError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading students...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load students. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Individual Student Schedules
          </h1>
          <p className="text-muted-foreground">
            Manage schedules for INDIVIDUAL student type
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              refetchStudents();
              refetchTimetables();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/individual/teacher-schedules")}
          >
            <Users className="h-4 w-4 mr-2" />
            View Teacher Schedules
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total INDIVIDUAL Students</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold">{enrichedStudents.length}</p>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>With Timetables</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold text-green-600">
                {studentsWithTimetables}
              </p>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Search Results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold">{filteredStudents.length}</p>
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search Students
          </CardTitle>
          <CardDescription>
            Find an INDIVIDUAL student to view or manage their schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, class, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      <Card>
        <CardHeader>
          <CardTitle>INDIVIDUAL Students</CardTitle>
          <CardDescription>
            Click on a student to view or manage their schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Students Found</h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "No INDIVIDUAL students available"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 rounded-lg border-2 border-border hover:border-primary transition-all cursor-pointer"
                  onClick={() => handleViewSchedule(student)}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar initials */}
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                      <div className="text-sm font-semibold text-primary">
                        {getInitials(student.fullName).toUpperCase()}
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold text-lg">
                        {student.fullName}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span>{student.className}</span>
                        <span>•</span>
                        <Badge 
                          variant="default"
                          className="text-xs bg-blue-600"
                        >
                          INDIVIDUAL
                        </Badge>
                        {student.email && (
                          <>
                            <span>•</span>
                            <span>{student.email}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {student.hasTimetable ? (
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="default" className="bg-green-600">
                          {student.timetableCount} Timetable{student.timetableCount > 1 ? 's' : ''}
                        </Badge>
                        {student.latestTimetableStatus && (
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                          >
                            {student.latestTimetableStatus}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <Badge variant="secondary">No Timetable</Badge>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewSchedule(student);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStudentScheduleListPage;