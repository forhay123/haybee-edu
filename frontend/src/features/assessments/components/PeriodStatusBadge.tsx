import React from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { AccessCheckAlert } from '../../../components/ui/accessCheckAlert';
import { Badge } from '@/components/ui/badge';
import { CountdownTimer } from '../../../components/ui/countdownTimer';
import { useAssessmentAccess } from '../hooks/useAssessmentAccess';
import {
  Lock,
  Unlock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Hourglass,
  Calendar
} from 'lucide-react';

import type { Assessment } from '../types/assessmentTypes';


interface PeriodStatusBadgeProps {
  status: 'COMPLETED' | 'AVAILABLE' | 'WAITING_ASSESSMENT' | 'LOCKED' | 'SCHEDULED';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const PeriodStatusBadge: React.FC<PeriodStatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true
}) => {
  const config = {
    COMPLETED: {
      color: 'bg-green-100 text-green-800 border-green-300',
      icon: CheckCircle2,
      label: 'Completed'
    },
    AVAILABLE: {
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      icon: Clock,
      label: 'Available'
    },
    WAITING_ASSESSMENT: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      icon: Hourglass,
      label: 'Waiting for Teacher'
    },
    LOCKED: {
      color: 'bg-gray-100 text-gray-800 border-gray-300',
      icon: Lock,
      label: 'Locked'
    },
    SCHEDULED: {
      color: 'bg-purple-100 text-purple-800 border-purple-300',
      icon: Calendar,
      label: 'Scheduled'
    }
  };

  const { color, icon: Icon, label } = config[status];
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  return (
    <Badge className={`${color} ${sizeClasses[size]} flex items-center gap-1`}>
      {showIcon && <Icon className="w-3 h-3" />}
      {label}
    </Badge>
  );
};