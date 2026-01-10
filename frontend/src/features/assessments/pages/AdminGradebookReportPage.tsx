// src/features/assessments/pages/AdminGradebookReportPage.tsx

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GradebookReportCard } from '../components/GradebookReportCard';
import { SubjectGradebookCard } from '../components/SubjectGradebookCard';
import { useStudentGradebookReport } from '../hooks/useGradebookReport';
import { useClasses } from '@/features/classes/hooks/useClasses';
import { useStudentProfiles } from '@/features/studentProfiles/hooks/useStudentProfiles';
import { GradeStatus } from '../types/gradebookTypes';
import { Download, Printer, Search, Filter, Users, GraduationCap, Building2, School, Home as HomeIcon, Award } from 'lucide-react';

type ClassLevel = 'JUNIOR' | 'SENIOR';
// ✅ FIX: Added 'ALL' to the type
type StudentTypeFilter = 'SCHOOL' | 'HOME' | 'ASPIRANT' | 'ALL';

/**
 * 👨‍💼 Admin Gradebook Report Page
 * Admin/Teacher view of student gradebook reports
 * 
 * Filter Hierarchy:
 * 1. Class Level (Junior/Senior)
 * 2. Department
 * 3. Student Type (School/Home/Aspirant)
 * 4. Class
 * 5. Student
 */
export const AdminGradebookReportPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Filter states
  const [selectedLevel, setSelectedLevel] = useState<ClassLevel | ''>('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [selectedStudentType, setSelectedStudentType] = useState<StudentTypeFilter | ''>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<GradeStatus | 'ALL'>('ALL');

  // Fetch data
  const { classes, isLoading: classesLoading } = useClasses();
  const { studentProfilesQuery } = useStudentProfiles();
  const { data: allStudents = [], isLoading: studentsLoading } = studentProfilesQuery;

  // Extract unique departments from classes
  const departments = useMemo(() => {
    const deptMap = new Map<number, { id: number; name: string }>();
    
    classes.forEach((cls) => {
      if (cls.departmentId && cls.departmentName) {
        deptMap.set(cls.departmentId, {
          id: cls.departmentId,
          name: cls.departmentName,
        });
      }
    });
    
    return Array.from(deptMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [classes]);

  // ✅ FIX: Filter classes by level - direct comparison instead of includes()
  const classesByLevel = useMemo(() => {
    if (!selectedLevel) return [];
    
    return classes.filter((cls) => {
      // Exclude INDIVIDUAL classes
      if (cls.studentType === 'INDIVIDUAL') return false;
      
      // Match level directly - API returns "JUNIOR" or "SENIOR"
      return cls.level?.toUpperCase() === selectedLevel;
    });
  }, [classes, selectedLevel]);

  // ✅ FIX: Filter classes by department with proper 'ALL' handling
  const classesByDepartment = useMemo(() => {
    if (!selectedDepartmentId || selectedDepartmentId === 'ALL') {
      return classesByLevel;
    }

    return classesByLevel.filter(
      (cls) => cls.departmentId === Number(selectedDepartmentId)
    );
  }, [classesByLevel, selectedDepartmentId]);

  // ✅ FIX: Filter classes by student type with proper 'ALL' handling
  const classesByStudentType = useMemo(() => {
    if (!selectedStudentType || selectedStudentType === 'ALL') {
      return classesByDepartment;
    }
    
    return classesByDepartment.filter(
      (cls) => cls.studentType === selectedStudentType
    );
  }, [classesByDepartment, selectedStudentType]);

  // ✅ FIX: Filter STUDENTS (not classes!) by selected class
  const studentsInClass = useMemo(() => {
    if (!selectedClassId) return [];
    
    return allStudents.filter(
      (student) => 
        student.classId === Number(selectedClassId) &&
        student.studentType !== 'INDIVIDUAL'
    );
  }, [allStudents, selectedClassId]);

  // Get selected student's data
  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return allStudents.find((s) => s.id === Number(selectedStudentId));
  }, [allStudents, selectedStudentId]);

  // Fetch gradebook report
  const { data: report, isLoading, error } = useStudentGradebookReport(
    Number(selectedStudentId),
    !!selectedStudentId
  );

  // Reset handlers for cascading dropdowns
  const handleLevelChange = (value: string) => {
    setSelectedLevel(value as ClassLevel);
    setSelectedDepartmentId('');
    setSelectedStudentType('');
    setSelectedClassId('');
    setSelectedStudentId('');
  };

  const handleDepartmentChange = (value: string) => {
    setSelectedDepartmentId(value);
    setSelectedStudentType('');
    setSelectedClassId('');
    setSelectedStudentId('');
  };

  const handleStudentTypeChange = (value: string) => {
    setSelectedStudentType(value as StudentTypeFilter);
    setSelectedClassId('');
    setSelectedStudentId('');
  };

  const handleClassChange = (value: string) => {
    setSelectedClassId(value);
    setSelectedStudentId('');
  };

  // Handle view subject details
  const handleViewSubjectDetails = (subjectId: number) => {
    navigate(`/admin/gradebook/student/${selectedStudentId}/subject/${subjectId}`);
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Handle export
  const handleExport = () => {
    if (!report) return;
    console.log('Exporting report for:', selectedStudent?.fullName);
    alert('Export functionality - implement CSV/PDF download here');
  };

  // Filter subjects
  const filteredSubjects = report?.subjects.filter((subject) => {
    const matchesSearch =
      searchTerm === '' ||
      subject.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.subjectCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || subject.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Student Gradebook Reports</h1>
          <p className="text-muted-foreground mt-1">
            View weighted grade reports for School, Home, and Aspirant students
          </p>
        </div>
        {selectedStudentId && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        )}
      </div>

      {/* Multi-Level Filter Selector */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <GraduationCap className="h-5 w-5 text-muted-foreground mt-2" />
              <div className="flex-1 space-y-4">
                
                {/* 1. Class Level */}
                <div>
                  <label className="text-sm font-medium mb-2 flex items-center gap-2">
                    <School className="h-4 w-4" />
                    1. Select Class Level
                  </label>
                  <Select value={selectedLevel} onValueChange={handleLevelChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose level (Junior or Senior)..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="JUNIOR">Junior Secondary (JSS)</SelectItem>
                      <SelectItem value="SENIOR">Senior Secondary (SSS)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    First, select whether you want Junior or Senior classes
                  </p>
                </div>

                {/* 2. Department */}
                <div>
                  <label className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    2. Select Department
                  </label>
                  <Select
                    value={selectedDepartmentId}
                    onValueChange={handleDepartmentChange}
                    disabled={!selectedLevel}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose department..." />
                    </SelectTrigger>
                    <SelectContent>
                      {!selectedLevel ? (
                        <SelectItem value="none" disabled>
                          Please select a level first
                        </SelectItem>
                      ) : departments.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No departments available
                        </SelectItem>
                      ) : (
                        <>
                          <SelectItem value="ALL">All Departments</SelectItem>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={String(dept.id)}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedLevel
                      ? `${departments.length} department${departments.length !== 1 ? 's' : ''} available`
                      : 'Select a level to see departments'}
                  </p>
                </div>

                {/* 3. Student Type */}
                <div>
                  <label className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    3. Select Student Type
                  </label>
                  <Select
                    value={selectedStudentType}
                    onValueChange={handleStudentTypeChange}
                    disabled={!selectedLevel || !selectedDepartmentId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose student type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {!selectedDepartmentId ? (
                        <SelectItem value="none" disabled>
                          Please select a department first
                        </SelectItem>
                      ) : (
                        <>
                          <SelectItem value="ALL">All Types</SelectItem>
                          <SelectItem value="SCHOOL">
                            <span className="flex items-center gap-2">
                              <School className="h-4 w-4" /> School Students
                            </span>
                          </SelectItem>
                          <SelectItem value="HOME">
                            <span className="flex items-center gap-2">
                              <HomeIcon className="h-4 w-4" /> Home Students
                            </span>
                          </SelectItem>
                          <SelectItem value="ASPIRANT">
                            <span className="flex items-center gap-2">
                              <Award className="h-4 w-4" /> Aspirant Students
                            </span>
                          </SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Filter by student enrollment type
                  </p>
                </div>

                {/* 4. Class */}
                <div>
                  <label className="text-sm font-medium mb-2 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    4. Select Class
                  </label>
                  <Select
                    value={selectedClassId}
                    onValueChange={handleClassChange}
                    disabled={!selectedLevel || !selectedDepartmentId || classesLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a class..." />
                    </SelectTrigger>
                    <SelectContent>
                      {!selectedDepartmentId ? (
                        <SelectItem value="none" disabled>
                          Please complete previous selections
                        </SelectItem>
                      ) : classesLoading ? (
                        <SelectItem value="loading" disabled>
                          Loading classes...
                        </SelectItem>
                      ) : classesByStudentType.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No classes match your filters
                        </SelectItem>
                      ) : (
                        classesByStudentType.map((cls) => (
                          <SelectItem key={cls.id} value={String(cls.id)}>
                            {cls.name} {cls.level && `(${cls.level})`}
                            {cls.studentType && (
                              <span className="text-xs text-muted-foreground ml-2">
                                • {cls.studentType}
                              </span>
                            )}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {classesByStudentType.length} class{classesByStudentType.length !== 1 ? 'es' : ''} match your filters
                  </p>
                </div>

                {/* 5. Student */}
                <div>
                  <label className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    5. Select Student
                  </label>
                  <Select
                    value={selectedStudentId}
                    onValueChange={setSelectedStudentId}
                    disabled={!selectedClassId || studentsLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a student..." />
                    </SelectTrigger>
                    <SelectContent>
                      {!selectedClassId ? (
                        <SelectItem value="none" disabled>
                          Please select a class first
                        </SelectItem>
                      ) : studentsLoading ? (
                        <SelectItem value="loading" disabled>
                          Loading students...
                        </SelectItem>
                      ) : studentsInClass.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No students in this class
                        </SelectItem>
                      ) : (
                        studentsInClass.map((student) => (
                          <SelectItem key={student.id} value={String(student.id)}>
                            {student.fullName || `Student #${student.id}`}
                            <span className="text-xs text-muted-foreground ml-2">
                              ({student.studentType})
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedClassId
                      ? `${studentsInClass.length} student${studentsInClass.length !== 1 ? 's' : ''} in this class`
                      : 'Select a class to see students'}
                  </p>
                </div>

              </div>
            </div>

            {/* Selected Student Info */}
            {selectedStudent && (
              <div className="mt-4 p-4 bg-muted rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Selected Student:</p>
                    <p className="text-lg font-semibold">{selectedStudent.fullName}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedStudent.className} • {selectedStudent.studentType}
                      {selectedStudent.departmentName && ` • ${selectedStudent.departmentName}`}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content based on selection */}
      {!selectedStudentId ? (
        <Card>
          <CardContent className="p-12 text-center">
            <GraduationCap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a Student</h3>
            <p className="text-muted-foreground mb-4">
              Complete all filter steps above to view a gradebook report
            </p>
            <div className="mt-4 text-sm text-muted-foreground space-y-1">
              <p>📚 Step 1: Select class level (Junior/Senior)</p>
              <p>🏢 Step 2: Select department</p>
              <p>👥 Step 3: Select student type</p>
              <p>🎓 Step 4: Select a class</p>
              <p>👨‍🎓 Step 5: Select a student</p>
            </div>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">
              Loading report for {selectedStudent?.fullName}...
            </p>
          </div>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p className="font-semibold">Error loading report</p>
              <p className="text-sm mt-2">{error.message}</p>
              <p className="text-xs text-muted-foreground mt-4">
                Student: {selectedStudent?.fullName} (ID: {selectedStudentId})
              </p>
            </div>
          </CardContent>
        </Card>
      ) : !report ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <p>No gradebook data found for {selectedStudent?.fullName}</p>
              <p className="text-xs mt-2">
                This student may not have any gradebook assessments yet.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overall Summary */}
          <GradebookReportCard report={report} />

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search subjects..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="w-full md:w-48">
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value as GradeStatus | 'ALL')}
                  >
                    <SelectTrigger className="gap-2">
                      <Filter className="h-4 w-4" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Subjects</SelectItem>
                      <SelectItem value="PASS">Passing</SelectItem>
                      <SelectItem value="FAIL">Failing</SelectItem>
                      <SelectItem value="INCOMPLETE">Incomplete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subject Cards */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">
              Subject Breakdown
              {filteredSubjects && filteredSubjects.length > 0 && (
                <span className="text-muted-foreground text-base ml-2">
                  ({filteredSubjects.length}{' '}
                  {filteredSubjects.length === 1 ? 'subject' : 'subjects'})
                </span>
              )}
            </h2>

            {filteredSubjects && filteredSubjects.length > 0 ? (
              filteredSubjects.map((subject) => (
                <SubjectGradebookCard
                  key={subject.subjectId}
                  subject={subject}
                  onViewDetails={handleViewSubjectDetails}
                />
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <p>No subjects found matching your filters</p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
};