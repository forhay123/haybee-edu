// src/features/assessments/pages/StudentGradebookReportPage.tsx

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
import { WeightDistributionChart } from '../components/WeightDistributionChart';
import { useMyGradebookReport } from '../hooks/useGradebookReport';
import { GradeStatus } from '../types/gradebookTypes';
import { Download, Printer, Search, Filter } from 'lucide-react';

/**
 * 📊 Student Gradebook Report Page
 * Main page for students to view their complete gradebook
 */
export const StudentGradebookReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: report, isLoading, error } = useMyGradebookReport();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<GradeStatus | 'ALL'>('ALL');
  const [showWeightChart, setShowWeightChart] = useState(false);

  // Handle view subject details
  const handleViewSubjectDetails = (subjectId: number) => {
    navigate(`/assessments/gradebook/subject/${subjectId}`);
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Handle export (placeholder - you can implement CSV/PDF export)
  const handleExport = () => {
    alert('Export functionality - implement CSV/PDF download here');
    // TODO: Implement export to CSV or PDF
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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your gradebook...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p className="font-semibold">Error loading gradebook</p>
              <p className="text-sm mt-2">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <p>No gradebook data available</p>
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
          <h1 className="text-3xl font-bold">My Gradebook</h1>
          <p className="text-muted-foreground mt-1">
            View your grades and academic progress
          </p>
        </div>
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
      </div>

      {/* Overall Summary */}
      <GradebookReportCard report={report} />

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
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

            {/* Status Filter */}
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

            {/* Show Weight Chart Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowWeightChart(!showWeightChart)}
            >
              {showWeightChart ? 'Hide' : 'Show'} Weights
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Weight Distribution Chart (Optional) */}
      {showWeightChart && <WeightDistributionChart />}

      {/* Subject Cards */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">
          Subject Breakdown
          {filteredSubjects && filteredSubjects.length > 0 && (
            <span className="text-muted-foreground text-base ml-2">
              ({filteredSubjects.length} {filteredSubjects.length === 1 ? 'subject' : 'subjects'})
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

      {/* Print-only Footer */}
      <div className="hidden print:block mt-8 pt-4 border-t">
        <p className="text-sm text-muted-foreground text-center">
          Generated on {new Date().toLocaleDateString()} at{' '}
          {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};