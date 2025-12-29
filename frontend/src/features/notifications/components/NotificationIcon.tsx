// frontend/src/features/notifications/components/NotificationIcon.tsx

import {
  FileText,
  Award,
  Clock,
  XCircle,
  Bell,
  Trophy,
  LucideIcon,
} from 'lucide-react';
import { NotificationType } from '../types/notificationTypes';

interface NotificationIconProps {
  type: NotificationType;
  className?: string;
  size?: number;
}

/**
 * Maps notification types to appropriate Lucide icons
 */
const iconMap: Record<NotificationType, LucideIcon> = {
  [NotificationType.ASSESSMENT_PUBLISHED]: FileText,
  [NotificationType.GRADE_RELEASED]: Award,
  [NotificationType.ASSIGNMENT_DUE]: Clock,
  [NotificationType.CLASS_CANCELLED]: XCircle,
  [NotificationType.SYSTEM_ALERT]: Bell,
  [NotificationType.ACHIEVEMENT_UNLOCKED]: Trophy,
};

/**
 * Color mapping for notification types
 */
const colorMap: Record<NotificationType, string> = {
  [NotificationType.ASSESSMENT_PUBLISHED]: 'text-blue-600 bg-blue-100',
  [NotificationType.GRADE_RELEASED]: 'text-green-600 bg-green-100',
  [NotificationType.ASSIGNMENT_DUE]: 'text-orange-600 bg-orange-100',
  [NotificationType.CLASS_CANCELLED]: 'text-red-600 bg-red-100',
  [NotificationType.SYSTEM_ALERT]: 'text-purple-600 bg-purple-100',
  [NotificationType.ACHIEVEMENT_UNLOCKED]: 'text-yellow-600 bg-yellow-100',
};

export const NotificationIcon: React.FC<NotificationIconProps> = ({
  type,
  className = '',
  size = 20,
}) => {
  const IconComponent = iconMap[type] || Bell;
  const colorClass = colorMap[type] || 'text-gray-600 bg-gray-100';

  return (
    <div className={`p-2 rounded-full ${colorClass} ${className}`}>
      <IconComponent size={size} />
    </div>
  );
};