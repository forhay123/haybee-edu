// src/features/assessments/pages/AdminGradebookReportPage.tsx

import React, { useState } from 'react';
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
import { GradeStatus } from '../types/gradebookTypes';
import { Download, Printer, Search, Filter, Users } from 'lucide-react';

/**
 * 👨‍💼 Admin Gradebook Report Page
 * Admin/Teacher view of student gradebook reports
 */
export const AdminGradebookReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<GradeStatus | 'ALL'>('ALL');

  const { data: report, isLoading, error } = useStudentGradebookReport(
    selectedStudentId!,
    !!selectedStudentId
  );

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
            View and manage student grade reports
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
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Enter Student ID..."
                value={selectedStudentId || ''}
                onChange={(e) => setSelectedStudentId(Number(e.target.value) || null)}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter a student ID to view their gradebook report
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content based on selection */}
      {!selectedStudentId ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a Student</h3>
            <p className="text-muted-foreground">
              Enter a student ID above to view their gradebook report
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading student report...</p>
          </div>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p className="font-semibold">Error loading report</p>
              <p className="text-sm mt-2">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      ) : !report ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <p>No gradebook data found for this student</p>
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