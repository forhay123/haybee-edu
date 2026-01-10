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
import { Download, Printer, Search, Filter, Users, GraduationCap } from 'lucide-react';

/**
 * 👨‍💼 Admin Gradebook Report Page
 * Admin/Teacher view of student gradebook reports
 * Excludes INDIVIDUAL students (they don't have gradebook assessments)
 */
export const AdminGradebookReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<GradeStatus | 'ALL'>('ALL');

  // Fetch classes (excluding INDIVIDUAL type)
  const { classes, isLoading: classesLoading } = useClasses();
  
  // Fetch all student profiles
  const { studentProfilesQuery } = useStudentProfiles();
  const { data: allStudents = [], isLoading: studentsLoading } = studentProfilesQuery;

  // Filter classes to exclude INDIVIDUAL students
  const nonIndividualClasses = useMemo(() => {
    return classes.filter(
      (cls) => cls.studentType !== 'INDIVIDUAL'
    );
  }, [classes]);

  // Filter students by selected class and exclude INDIVIDUAL type
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

  // Handle class change
  const handleClassChange = (value: string) => {
    setSelectedClassId(value);
    setSelectedStudentId(''); // Reset student selection
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
    // TODO: Implement CSV/PDF export
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
            View and manage student grade reports (School/Home/Aspirant students only)
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

      {/* Student Selector */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <GraduationCap className="h-5 w-5 text-muted-foreground mt-2" />
              <div className="flex-1 space-y-4">
                {/* Class Selector */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    1. Select Class
                  </label>
                  <Select
                    value={selectedClassId}
                    onValueChange={handleClassChange}
                    disabled={classesLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a class..." />
                    </SelectTrigger>
                    <SelectContent>
                      {classesLoading ? (
                        <SelectItem value="loading" disabled>
                          Loading classes...
                        </SelectItem>
                      ) : nonIndividualClasses.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No classes available
                        </SelectItem>
                      ) : (
                        nonIndividualClasses.map((cls) => (
                          <SelectItem key={cls.id} value={String(cls.id)}>
                            {cls.name} {cls.level && `(${cls.level})`}
                            {cls.departmentName && (
                              <span className="text-xs text-muted-foreground ml-2">
                                - {cls.departmentName}
                              </span>
                            )}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select a class to see students in that class
                  </p>
                </div>

                {/* Student Selector */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    2. Select Student
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
            <p className="text-muted-foreground">
              Choose a class and student above to view their gradebook report
            </p>
            <div className="mt-4 text-sm text-muted-foreground">
              <p>📚 Step 1: Select a class</p>
              <p>👨‍🎓 Step 2: Select a student from that class</p>
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