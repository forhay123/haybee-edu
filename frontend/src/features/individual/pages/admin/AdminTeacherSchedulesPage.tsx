// frontend/src/features/individual/pages/admin/AdminTeacherSchedulesPage.tsx

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
  BookOpen,
  Clock,
  Filter,
  ArrowLeft,
} from "lucide-react";
import axios from "../../../../api/axios";

interface TeacherProfileFromApi {
  id: number;
  userId: number;
  userName: string;
  userEmail?: string;
  departmentId: number;
  departmentName: string;
  specialization?: string;
  subjectIds?: number[];
  assignedClassIds?: number[];
}

interface Subject {
  id: number;
  name: string;
  code: string;
  level: string;
  grade: string;
}

interface EnrichedTeacher {
  id: number;
  userId: number;
  userName: string;
  userEmail?: string;
  departmentId: number;
  departmentName: string;
  assignedSubjects: Subject[];
  totalSubjects: number;
  subjectNames: string;
}

const AdminTeacherSchedulesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<EnrichedTeacher | null>(null);

  // Fetch all subjects to map IDs to full subject objects
  const { data: allSubjects = [] } = useQuery<Subject[]>({
    queryKey: ["subjects", "all"],
    queryFn: async () => {
      const res = await axios.get("/subjects");
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch all teachers
  const { 
    data: teachers = [], 
    isLoading: teachersLoading, 
    error: teachersError, 
    refetch: refetchTeachers 
  } = useQuery<TeacherProfileFromApi[]>({
    queryKey: ["teachers", "all"],
    queryFn: async () => {
      const res = await axios.get("/teachers");
      return res.data;
    },
    staleTime: 30000,
  });

  // Enrich teachers with full subject objects
  const enrichedTeachers: EnrichedTeacher[] = useMemo(() => {
    return teachers.map((teacher) => {
      // Map subjectIds to full subject objects
      const assignedSubjects = (teacher.subjectIds || [])
        .map(subjectId => allSubjects.find(s => s.id === subjectId))
        .filter((s): s is Subject => s !== undefined);

      return {
        id: teacher.id,
        userId: teacher.userId,
        userName: teacher.userName,
        userEmail: teacher.userEmail,
        departmentId: teacher.departmentId,
        departmentName: teacher.departmentName,
        assignedSubjects,
        totalSubjects: assignedSubjects.length,
        subjectNames: assignedSubjects.length > 0
          ? assignedSubjects.map(s => s.name).join(", ")
          : "No subjects assigned",
      };
    });
  }, [teachers, allSubjects]);

  // Filter teachers based on search
  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return enrichedTeachers;

    const query = searchQuery.toLowerCase();
    return enrichedTeachers.filter((teacher) => {
      const userName = teacher.userName?.toLowerCase() ?? "";
      const userEmail = teacher.userEmail?.toLowerCase() ?? "";
      const departmentName = teacher.departmentName?.toLowerCase() ?? "";
      const subjects = teacher.subjectNames?.toLowerCase() ?? "";

      return (
        userName.includes(query) ||
        userEmail.includes(query) ||
        departmentName.includes(query) ||
        subjects.includes(query)
      );
    });
  }, [enrichedTeachers, searchQuery]);

  // Helper to get initials from name
  const getInitials = (name: string | undefined | null) => {
    if (!name || typeof name !== 'string') return "?";
    
    const trimmedName = name.trim();
    if (!trimmedName) return "?";
    
    const parts = trimmedName.split(/\s+/);
    if (parts.length >= 2) {
      return parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
    }
    return parts[0]?.charAt(0) ?? "?";
  };

  const isLoading = teachersLoading;
  const error = teachersError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading teachers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load teachers. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  // Show teacher details modal
  if (selectedTeacher) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedTeacher(null)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Users className="h-8 w-8" />
                {selectedTeacher.userName}'s Schedule
              </h1>
              <p className="text-muted-foreground">
                View teaching schedule and assigned subjects
              </p>
            </div>
          </div>
        </div>

        {/* Teacher Info */}
        <Card>
          <CardHeader>
            <CardTitle>Teacher Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                <p className="text-lg font-semibold">{selectedTeacher.userName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-lg font-semibold">{selectedTeacher.userEmail || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Department</p>
                <p className="text-lg font-semibold">{selectedTeacher.departmentName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Subjects</p>
                <p className="text-lg font-semibold">{selectedTeacher.totalSubjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assigned Subjects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Assigned Subjects
            </CardTitle>
            <CardDescription>
              Subjects this teacher is assigned to teach
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedTeacher.totalSubjects === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No subjects assigned
              </div>
            ) : (
              <div className="space-y-2">
                {selectedTeacher.assignedSubjects?.map((subject) => (
                  <div
                    key={subject.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted"
                  >
                    <div>
                      <p className="font-semibold">{subject.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {subject.code} • {subject.grade} • {subject.level}
                      </p>
                    </div>
                    <Badge variant="outline">{subject.grade}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Teaching Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Teaching Schedule
            </CardTitle>
            <CardDescription>
              Schedule based on assigned students' timetables for these subjects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                The teaching schedule is generated from INDIVIDUAL students' timetables 
                that include any of the {selectedTeacher.totalSubjects} assigned subject{selectedTeacher.totalSubjects !== 1 ? 's' : ''}.
              </AlertDescription>
            </Alert>

            <div className="mt-6 text-center py-8">
              <Button
                onClick={() => navigate(`/admin/individual/teacher-schedule?teacherId=${selectedTeacher.id}`)}
                disabled={selectedTeacher.totalSubjects === 0}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Full Schedule
              </Button>
              {selectedTeacher.totalSubjects === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Assign subjects to this teacher to view their schedule
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Teacher Schedules
          </h1>
          <p className="text-muted-foreground">
            View teaching schedules for all teachers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetchTeachers()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/individual/schedules")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Student Schedules
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Teachers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold">{enrichedTeachers.length}</p>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>With Subjects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold text-green-600">
                {enrichedTeachers.filter(t => t.totalSubjects > 0).length}
              </p>
              <BookOpen className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Search Results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold">{filteredTeachers.length}</p>
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
            Search Teachers
          </CardTitle>
          <CardDescription>
            Find a teacher to view their assigned subjects and schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, department, or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Teachers List */}
      <Card>
        <CardHeader>
          <CardTitle>Teachers</CardTitle>
          <CardDescription>
            Click on a teacher to view their details and schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTeachers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Teachers Found</h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "No teachers available"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTeachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="flex items-center justify-between p-4 rounded-lg border-2 border-border hover:border-primary transition-all cursor-pointer"
                  onClick={() => setSelectedTeacher(teacher)}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar initials */}
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                      <div className="text-sm font-semibold text-primary">
                        {getInitials(teacher.userName).toUpperCase()}
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold text-lg">
                        {teacher.userName || "Unknown Teacher"}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span>{teacher.departmentName}</span>
                        <span>•</span>
                        <span>{teacher.totalSubjects} subject{teacher.totalSubjects !== 1 ? 's' : ''}</span>
                        {teacher.userEmail && (
                          <>
                            <span>•</span>
                            <span>{teacher.userEmail}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {teacher.totalSubjects > 0 ? (
                      <Badge variant="default" className="bg-green-600">
                        {teacher.totalSubjects} Subject{teacher.totalSubjects > 1 ? 's' : ''}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">No Subjects</Badge>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTeacher(teacher);
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

export default AdminTeacherSchedulesPage;