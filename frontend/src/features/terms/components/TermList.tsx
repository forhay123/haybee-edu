import React from "react";
import TermCard from "./TermCard";
import { useGetTerms, useDeleteTerm, TermResponseDto } from "../api/termsApi";

interface TermListProps {
  onEdit?: (term: TermResponseDto) => void;
  showActions?: boolean;
}

const TermList: React.FC<TermListProps> = ({ onEdit, showActions = false }) => {
  const { data: terms, isLoading, isError } = useGetTerms();
  const { mutate: deleteTerm, isPending: isDeleting } = useDeleteTerm();

  const handleDelete = (id: number) => {
    if (window.confirm("🗑️ Delete this term? This action cannot be undone.")) {
      deleteTerm(id, {
        onSuccess: () => alert("✅ Term deleted successfully!"),
        onError: () => alert("❌ Failed to delete term."),
      });
    }
  };

  if (isLoading)
    return <p className="text-center py-8 text-muted-foreground">Loading terms...</p>;

  if (isError)
    return <p className="text-center py-8 text-red-500">Failed to load terms.</p>;

  if (!terms || terms.length === 0)
    return <p className="text-center py-8 text-blue-500">No terms found.</p>;

  return (
    <div className="space-y-3">
      {terms.map((term) => (
        <TermCard
          key={term.id}
          term={term}
          onEdit={showActions ? onEdit : undefined}
          onDelete={showActions ? handleDelete : undefined}
          isDeleting={isDeleting}
        />
      ))}
    </div>
  );
};

export default TermList;
