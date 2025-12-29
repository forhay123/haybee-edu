import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CustomBadge as Badge } from '@/components/ui/custom-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, XCircle, Info } from 'lucide-react';
import { ValidationResult } from '@/features/assessments/types/assessmentTypes';

interface ValidationErrorAlertProps {
  validationResult: ValidationResult;
  onDismiss?: () => void;
  showDetails?: boolean;
}

const ValidationErrorAlert: React.FC<ValidationErrorAlertProps> = ({
  validationResult,
  onDismiss,
  showDetails = true,
}) => {
  const [expanded, setExpanded] = React.useState(false);

  if (validationResult.canCreate) {
    return null;
  }

  // Convert reason to array safely
  const errors: string[] = Array.isArray(validationResult.reason)
    ? validationResult.reason
    : validationResult.reason
    ? [validationResult.reason]
    : [];

  // Group errors
  const criticalErrors = errors.filter((e: string) =>
    e.toLowerCase().includes('cannot') || e.toLowerCase().includes('must')
  );

  const warnings = errors.filter((e: string) => !criticalErrors.includes(e));

  // Decide severity display
  const getSeverityInfo = () => {
    if (criticalErrors.length > 0) {
      return {
        icon: <XCircle className="h-5 w-5" />,
        variant: 'destructive' as const,
        title: 'Validation Failed',
        description: 'This schedule cannot be saved due to critical errors.',
      };
    }

    return {
      icon: <AlertTriangle className="h-5 w-5" />,
      variant: 'default' as const,
      title: 'Validation Warnings',
      description: 'Please review the following issues.',
    };
  };

  const severityInfo = getSeverityInfo();

  return (
    <Alert variant={severityInfo.variant} className="mb-4">
      <div className="flex items-start gap-3">
        {severityInfo.icon}

        <div className="flex-1 space-y-2">
          <AlertTitle className="flex items-center justify-between">
            <span>{severityInfo.title}</span>

            <div className="flex items-center gap-2">
              <Badge
                variant={
                  severityInfo.variant === 'destructive'
                    ? 'danger'
                    : 'secondary'
                }
              >
                {errors.length} issue{errors.length !== 1 ? 's' : ''}
              </Badge>

              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="h-auto p-1"
                >
                  ×
                </Button>
              )}
            </div>
          </AlertTitle>

          <AlertDescription>{severityInfo.description}</AlertDescription>

          {showDetails && (
            <>
              <div className="mt-3 space-y-2">
                {/* Critical Errors */}
                {criticalErrors.length > 0 && (
                  <div className="flex items-start gap-2 text-sm">
                    <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>
                        {criticalErrors.length} Critical Error
                        {criticalErrors.length !== 1 ? 's' : ''}
                      </strong>

                      <ul className="mt-1 space-y-1 list-disc list-inside">
                        {criticalErrors
                          .slice(0, expanded ? undefined : 2)
                          .map((error, idx) => (
                            <li key={idx} className="text-sm">
                              {error}
                            </li>
                          ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {warnings.length > 0 && (
                  <div className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>
                        {warnings.length} Warning
                        {warnings.length !== 1 ? 's' : ''}
                      </strong>

                      <ul className="mt-1 space-y-1 list-disc list-inside">
                        {warnings
                          .slice(0, expanded ? undefined : 2)
                          .map((error, idx) => (
                            <li key={idx} className="text-sm">
                              {error}
                            </li>
                          ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Expand / Collapse */}
              {errors.length > 4 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className="mt-2"
                >
                  {expanded
                    ? 'Show Less'
                    : `Show All ${errors.length} Issues`}
                </Button>
              )}
            </>
          )}

          {/* Suggested Fixes */}
          {validationResult.suggested_fixes &&
            validationResult.suggested_fixes.length > 0 && (
              <Card className="mt-3 bg-muted/50">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Suggestions
                  </CardTitle>
                </CardHeader>

                <CardContent className="py-2">
                  <ul className="space-y-1 text-sm">
                    {validationResult.suggested_fixes?.map((fix: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>{fix}</span>
                    </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
        </div>
      </div>
    </Alert>
  );
};

export default ValidationErrorAlert;
