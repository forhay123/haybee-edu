// frontend/src/features/individual/hooks/admin/useSubjectMapping.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { adminTimetableApi } from "../../api/individualApi";
import axios from "../../../../api/axios";

interface TimetableEntry {
  dayOfWeek: string;
  periodNumber: number;
  subjectName: string;
  subjectId?: number;
  startTime?: string;
  endTime?: string;
  mappingConfidence?: number;
  room?: string;
  teacher?: string;
}

interface SubjectOption {
  id: number;
  name: string;
  code?: string;
  departmentId?: number;
  departmentName?: string;
}

/**
 * Hook to fetch all available subjects for mapping
 */
export function useAvailableSubjects() {
  return useQuery<SubjectOption[]>({
    queryKey: ["subjects", "all"],
    queryFn: async () => {
      const res = await axios.get("/subjects");
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch timetable entries for editing
 */
export function useTimetableEntries(timetableId: number | null) {
  return useQuery<TimetableEntry[]>({
    queryKey: ["timetable-entries", timetableId],
    queryFn: async () => {
      const res = await axios.get(`/individual/timetable/${timetableId}/entries`);
      return res.data;
    },
    enabled: !!timetableId,
    staleTime: 30000,
  });
}

/**
 * Hook to update subject mapping for a timetable entry
 */
export function useUpdateSubjectMapping() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { timetableId: number; entryIndex: number; subjectId: number }
  >({
    mutationFn: async ({ timetableId, entryIndex, subjectId }) => {
      await adminTimetableApi.updateSubjectMapping(timetableId, entryIndex, subjectId);
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ["timetable-entries", variables.timetableId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin-timetables"],
      });
      queryClient.invalidateQueries({
        queryKey: ["timetable-status", variables.timetableId],
      });

      toast.success("Subject mapping updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update subject mapping");
    },
  });
}

/**
 * Hook to batch update multiple subject mappings
 */
export function useBatchUpdateMappings() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    {
      timetableId: number;
      mappings: Array<{ entryIndex: number; subjectId: number }>;
    }
  >({
    mutationFn: async ({ timetableId, mappings }) => {
      // Update mappings sequentially
      for (const mapping of mappings) {
        await adminTimetableApi.updateSubjectMapping(
          timetableId,
          mapping.entryIndex,
          mapping.subjectId
        );
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["timetable-entries", variables.timetableId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin-timetables"],
      });

      toast.success(
        `Successfully updated ${variables.mappings.length} subject mapping${
          variables.mappings.length > 1 ? "s" : ""
        }`
      );
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update subject mappings");
    },
  });
}

/**
 * Hook to get unmapped entries for a timetable
 */
export function useUnmappedEntries(timetableId: number | null) {
  const { data: entries = [], isLoading, error } = useTimetableEntries(timetableId);

  const unmappedEntries = entries.filter((entry) => !entry.subjectId);
  const mappedEntries = entries.filter((entry) => entry.subjectId);
  const lowConfidenceEntries = entries.filter(
    (entry) => entry.mappingConfidence && entry.mappingConfidence < 0.7
  );

  return {
    allEntries: entries,
    unmappedEntries,
    mappedEntries,
    lowConfidenceEntries,
    isLoading,
    error,
    unmappedCount: unmappedEntries.length,
    mappedCount: mappedEntries.length,
    lowConfidenceCount: lowConfidenceEntries.length,
    totalCount: entries.length,
    mappingProgress: entries.length > 0 ? (mappedEntries.length / entries.length) * 100 : 0,
  };
}

/**
 * Hook to search subjects by name (for autocomplete)
 */
export function useSubjectSearch(query: string) {
  const { data: allSubjects = [] } = useAvailableSubjects();

  const searchResults = query.trim()
    ? allSubjects.filter(
        (subject) =>
          subject.name.toLowerCase().includes(query.toLowerCase()) ||
          subject.code?.toLowerCase().includes(query.toLowerCase())
      )
    : allSubjects;

  return {
    results: searchResults.slice(0, 10), // Limit to 10 results
    totalResults: searchResults.length,
  };
}

/**
 * Hook to get subject mapping suggestions based on name similarity
 */
export function useSubjectSuggestions(extractedName: string) {
  const { data: allSubjects = [] } = useAvailableSubjects();

  // Simple similarity scoring
  const getSimilarityScore = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    // Exact match
    if (s1 === s2) return 1.0;

    // Contains check
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;

    // Word overlap
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    const commonWords = words1.filter((w) => words2.includes(w));
    if (commonWords.length > 0) {
      return commonWords.length / Math.max(words1.length, words2.length);
    }

    return 0;
  };

  const suggestions = allSubjects
    .map((subject) => ({
      ...subject,
      similarityScore: getSimilarityScore(extractedName, subject.name),
    }))
    .filter((s) => s.similarityScore > 0.3)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, 5); // Top 5 suggestions

  return {
    suggestions,
    hasSuggestions: suggestions.length > 0,
    topSuggestion: suggestions[0] || null,
  };
}

/**
 * Hook to validate subject mapping
 */
export function useValidateMapping() {
  const validateMapping = (
    extractedName: string,
    subjectId: number,
    availableSubjects: SubjectOption[]
  ): {
    isValid: boolean;
    warning?: string;
    confidence: number;
  } => {
    const subject = availableSubjects.find((s) => s.id === subjectId);

    if (!subject) {
      return {
        isValid: false,
        warning: "Selected subject not found",
        confidence: 0,
      };
    }

    // Calculate confidence based on name similarity
    const similarity =
      extractedName.toLowerCase() === subject.name.toLowerCase()
        ? 1.0
        : extractedName.toLowerCase().includes(subject.name.toLowerCase()) ||
          subject.name.toLowerCase().includes(extractedName.toLowerCase())
        ? 0.8
        : 0.5;

    let warning: string | undefined;
    if (similarity < 0.7) {
      warning = `Low similarity between "${extractedName}" and "${subject.name}"`;
    }

    return {
      isValid: true,
      warning,
      confidence: similarity,
    };
  };

  return { validateMapping };
}