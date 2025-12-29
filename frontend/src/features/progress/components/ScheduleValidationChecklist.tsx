import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomBadge as Badge } from '@/components/ui/custom-badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { ValidationResult } from '@/features/assessments/types/assessmentTypes';

interface ValidationCheck {
  id: string;
  label: string;
  description: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  message?: string;
}

interface ScheduleValidationChecklistProps {
  validationResult?: ValidationResult;
  isValidating?: boolean;
  customChecks?: ValidationCheck[];
}

const ScheduleValidationChecklist: React.FC<ScheduleValidationChecklistProps> = ({
  validationResult,
  isValidating = false,
  customChecks = [],
}) => {

  // Build checks from validation result
  const checks = React.useMemo(() => {
    const builtChecks: ValidationCheck[] = [...customChecks];

    if (validationResult) {

      // SAFELY NORMALIZE validationResult.reason → ALWAYS array
      const reasons: string[] = Array.isArray(validationResult.reason)
        ? validationResult.reason
        : validationResult.reason
        ? [validationResult.reason]
        : [];

      // ---- Categorize errors safely ----
      const errorTypes = {
        assessment: reasons.filter((e: string) =>
          e.toLowerCase().includes('assessment') ||
          e.toLowerCase().includes('question')
        ),
        scheduling: reasons.filter((e: string) =>
          e.toLowerCase().includes('schedule') ||
          e.toLowerCase().includes('date')
        ),
        requirements: reasons.filter((e: string) =>
          e.toLowerCase().includes('must') ||
          e.toLowerCase().includes('required')
        ),
      };

      // Overall validation status
      builtChecks.push({
        id: 'overall',
        label: 'Schedule Validity',
        description: 'Overall schedule structure and requirements',
        status: validationResult.canCreate ? 'pass' : 'fail',
        message: validationResult.canCreate
          ? 'Schedule meets all requirements'
          : reasons[0] || 'Validation failed',
      });

      // ---- Assessment Check ----
      if (errorTypes.assessment.length > 0) {
        builtChecks.push({
          id: 'assessments',
          label: 'Assessment Configuration',
          description: 'All lessons have properly configured assessments',
          status: 'fail',
          message: errorTypes.assessment[0],
        });
      } else if (validationResult.canCreate) {
        builtChecks.push({
          id: 'assessments',
          label: 'Assessment Configuration',
          description: 'All lessons have properly configured assessments',
          status: 'pass',
          message: 'All assessments are properly configured',
        });
      }

      // ---- Scheduling Check ----
      if (errorTypes.scheduling.length > 0) {
        builtChecks.push({
          id: 'scheduling',
          label: 'Schedule Dates',
          description: 'Lessons are scheduled in the correct time range',
          status: 'fail',
          message: errorTypes.scheduling[0],
        });
      } else if (validationResult.canCreate) {
        builtChecks.push({
          id: 'scheduling',
          label: 'Schedule Dates',
          description: 'Lessons are scheduled in the correct time range',
          status: 'pass',
          message: 'All dates are valid',
        });
      }

      // ---- Requirements Check ----
      if (errorTypes.requirements.length > 0) {
        builtChecks.push({
          id: 'requirements',
          label: 'Required Fields',
          description: 'All required information is provided',
          status: 'fail',
          message: errorTypes.requirements[0],
        });
      } else if (validationResult.canCreate) {
        builtChecks.push({
          id: 'requirements',
          label: 'Required Fields',
          description: 'All required information is provided',
          status: 'pass',
          message: 'All requirements met',
        });
      }
    }

    return builtChecks;
  }, [validationResult, customChecks]);

  // Get status icon
  const getStatusIcon = (status: ValidationCheck['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'pending':
        return <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />;
    }
  };

  // Get status badge
  const getStatusBadge = (status: ValidationCheck['status']) => {
    switch (status) {
      case 'pass':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Pass</Badge>;
      case 'fail':
        return <Badge variant="danger">Failed</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200">Warning</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  // Summary
  const summary = React.useMemo(() => {
    const passed = checks.filter(c => c.status === 'pass').length;
    const failed = checks.filter(c => c.status === 'fail').length;
    const warnings = checks.filter(c => c.status === 'warning').length;
    const pending = checks.filter(c => c.status === 'pending').length;

    return { passed, failed, warnings, pending, total: checks.length };
  }, [checks]);

  if (isValidating) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Validating schedule...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Validation Checklist</CardTitle>
            <CardDescription>
              {summary.total} check{summary.total !== 1 ? 's' : ''} completed
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {summary.passed > 0 && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {summary.passed} Passed
              </Badge>
            )}
            {summary.failed > 0 && (
              <Badge variant="danger">{summary.failed} Failed</Badge>
            )}
            {summary.warnings > 0 && (
              <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                {summary.warnings} Warning{summary.warnings !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Alert */}
        {validationResult && !validationResult.canCreate && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This schedule has validation errors and cannot be saved until they are resolved.
            </AlertDescription>
          </Alert>
        )}

        {validationResult && validationResult.canCreate && (
          <Alert variant="default" className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              All validation checks passed! This schedule is ready to be saved.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {checks.map((check) => (
            <div
              key={check.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                check.status === 'fail'
                  ? 'border-destructive/50 bg-destructive/5'
                  : check.status === 'warning'
                  ? 'border-yellow-200 bg-yellow-50'
                  : 'border-border bg-background'
              }`}
            >
              <div className="mt-0.5">
                {getStatusIcon(check.status)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="text-sm font-medium">{check.label}</h4>
                  {getStatusBadge(check.status)}
                </div>

                <p className="text-sm text-muted-foreground">{check.description}</p>

                {check.message && (
                  <p
                    className={`text-sm mt-2 ${
                      check.status === 'fail'
                        ? 'text-destructive'
                        : check.status === 'warning'
                        ? 'text-yellow-700'
                        : 'text-green-700'
                    }`}
                  >
                    {check.message}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {checks.length === 0 && !isValidating && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>No validation checks to display</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ScheduleValidationChecklist;
