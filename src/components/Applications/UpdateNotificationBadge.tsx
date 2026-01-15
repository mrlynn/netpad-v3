/**
 * Update Notification Badge
 *
 * Badge component showing count of available updates for installed applications.
 */

'use client';

import { Badge, BadgeProps } from '@mui/material';
import { Update as UpdateIcon } from '@mui/icons-material';

interface UpdateNotificationBadgeProps extends Omit<BadgeProps, 'badgeContent'> {
  count: number;
  children: React.ReactNode;
}

export function UpdateNotificationBadge({ count, children, ...badgeProps }: UpdateNotificationBadgeProps) {
  if (count === 0) {
    return <>{children}</>;
  }

  return (
    <Badge
      badgeContent={count}
      color="warning"
      {...badgeProps}
    >
      {children}
    </Badge>
  );
}
