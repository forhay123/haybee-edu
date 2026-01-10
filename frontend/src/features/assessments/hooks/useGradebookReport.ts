import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { gradebookReportApi } from '../api/gradebookReportApi';
import {
  GradebookReportDto,
  SubjectGradebookDto,
  AssessmentWeights,
} from '../types/gradebookTypes';

/**
 * 📊 Gradebook Report Hooks
 * React Query hooks for fetching gradebook data
 */

/**
 * ✅ Hook: Fetch logged-in student's full gradebook report
 * 
 * @example
 * const { data: report, isLoading, error } = useMyGradebookReport();
 */
export const useMyGradebookReport = (): UseQueryResult<
  GradebookReportDto,
  Error
> => {
  return useQuery({
    queryKey: ['gradebook', 'report', 'me'],
    queryFn: gradebookReportApi.getMyGradebookReport,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
};

/**
 * ✅ Hook: Fetch gradebook for a single subject
 * 
 * @param subjectId - ID of the subject
 * @param enabled - Whether to enable the query (default: true)
 * 
 * @example
 * const { data: subjectGrade } = useSubjectGradebook(25);
 */
export const useSubjectGradebook = (
  subjectId: number,
  enabled = true
): UseQueryResult<SubjectGradebookDto, Error> => {
  return useQuery({
    queryKey: ['gradebook', 'subject', subjectId],
    queryFn: () => gradebookReportApi.getSubjectGradebook(subjectId),
    enabled: enabled && !!subjectId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * ✅ Hook: Fetch assessment weights
 * 
 * @example
 * const { data: weights } = useAssessmentWeights();
 * // weights = { QUIZ: 20, CLASSWORK: 10, ... }
 */
export const useAssessmentWeights = (): UseQueryResult<
  AssessmentWeights,
  Error
> => {
  return useQuery({
    queryKey: ['gradebook', 'weights'],
    queryFn: gradebookReportApi.getAssessmentWeights,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours (weights rarely change)
    refetchOnWindowFocus: false,
  });
};

/**
 * ✅ Hook: Admin/Teacher view - Fetch any student's gradebook report
 * 
 * @param studentId - ID of the student
 * @param enabled - Whether to enable the query (default: true)
 * 
 * @example
 * const { data: studentReport } = useStudentGradebookReport(21);
 */
export const useStudentGradebookReport = (
  studentId: number,
  enabled = true
): UseQueryResult<GradebookReportDto, Error> => {
  return useQuery({
    queryKey: ['gradebook', 'report', 'student', studentId],
    queryFn: () => gradebookReportApi.getStudentGradebookReport(studentId),
    enabled: enabled && !!studentId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * ✅ Hook: Admin/Teacher view - Fetch student's subject gradebook
 * 
 * @param studentId - ID of the student
 * @param subjectId - ID of the subject
 * @param enabled - Whether to enable the query (default: true)
 * 
 * @example
 * const { data } = useStudentSubjectGradebook(21, 25);
 */
export const useStudentSubjectGradebook = (
  studentId: number,
  subjectId: number,
  enabled = true
): UseQueryResult<SubjectGradebookDto, Error> => {
  return useQuery({
    queryKey: ['gradebook', 'student', studentId, 'subject', subjectId],
    queryFn: () =>
      gradebookReportApi.getStudentSubjectGradebook(studentId, subjectId),
    enabled: enabled && !!studentId && !!subjectId,
    staleTime: 5 * 60 * 1000,
  });
};