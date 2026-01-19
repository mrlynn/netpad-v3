/**
 * Template Icon Component
 *
 * Renders Lucide icons from string names stored in templates.
 * Falls back to text/emoji display if icon name is not found.
 */

import * as LucideIcons from 'lucide-react';
import { Box, SxProps, Theme } from '@mui/material';

// Map of icon names to Lucide components
const ICON_MAP: Record<string, LucideIcons.LucideIcon> = {
  // Business & Sales
  MessageSquare: LucideIcons.MessageSquare,
  UserPlus: LucideIcons.UserPlus,
  Calculator: LucideIcons.Calculator,
  Building2: LucideIcons.Building2,
  Presentation: LucideIcons.Presentation,
  Handshake: LucideIcons.Handshake,
  UserCheck: LucideIcons.UserCheck,
  DollarSign: LucideIcons.DollarSign,
  Share2: LucideIcons.Share2,
  Calendar: LucideIcons.Calendar,

  // HR & Recruitment
  Briefcase: LucideIcons.Briefcase,
  LogOut: LucideIcons.LogOut,
  ClipboardCheck: LucideIcons.ClipboardCheck,
  CalendarOff: LucideIcons.CalendarOff,
  UserPlus2: LucideIcons.UserPlus2,
  GraduationCap: LucideIcons.GraduationCap,
  AlertTriangle: LucideIcons.AlertTriangle,

  // Customer Service
  Star: LucideIcons.Star,
  TicketPlus: LucideIcons.TicketPlus,
  PackageX: LucideIcons.PackageX,
  ShieldCheck: LucideIcons.ShieldCheck,
  MessageSquareWarning: LucideIcons.MessageSquareWarning,
  Lightbulb: LucideIcons.Lightbulb,
  XCircle: LucideIcons.XCircle,
  Quote: LucideIcons.Quote,

  // Marketing & Research
  CalendarCheck: LucideIcons.CalendarCheck,
  PieChart: LucideIcons.PieChart,
  TrendingUp: LucideIcons.TrendingUp,
  Mail: LucideIcons.Mail,
  Video: LucideIcons.Video,
  Trophy: LucideIcons.Trophy,
  Users: LucideIcons.Users,
  Sparkles: LucideIcons.Sparkles,

  // Education & Training
  BookOpen: LucideIcons.BookOpen,
  Award: LucideIcons.Award,
  Wrench: LucideIcons.Wrench,
  HelpCircle: LucideIcons.HelpCircle,

  // Healthcare & Wellness
  ClipboardList: LucideIcons.ClipboardList,
  CalendarPlus: LucideIcons.CalendarPlus,
  FileHeart: LucideIcons.FileHeart,
  HeartPulse: LucideIcons.HeartPulse,
  Dumbbell: LucideIcons.Dumbbell,

  // Real Estate
  Home: LucideIcons.Home,
  FileText: LucideIcons.FileText,
  FileSignature: LucideIcons.FileSignature,

  // Legal & Compliance
  FileKey: LucideIcons.FileKey,
  Scale: LucideIcons.Scale,
  AlertCircle: LucideIcons.AlertCircle,
  FileSearch: LucideIcons.FileSearch,

  // Nonprofit & Community
  Heart: LucideIcons.Heart,
  HandHeart: LucideIcons.HandHeart,

  // Events & Hospitality
  Building: LucideIcons.Building,
  UtensilsCrossed: LucideIcons.UtensilsCrossed,
  MapPin: LucideIcons.MapPin,
  Utensils: LucideIcons.Utensils,
  Map: LucideIcons.Map,

  // Technology & IT
  Bug: LucideIcons.Bug,
  Headphones: LucideIcons.Headphones,
  Monitor: LucideIcons.Monitor,
  Key: LucideIcons.Key,
  ShieldAlert: LucideIcons.ShieldAlert,
  FlaskConical: LucideIcons.FlaskConical,

  // Finance & Accounting
  Receipt: LucideIcons.Receipt,
  CreditCard: LucideIcons.CreditCard,
  ShoppingCart: LucideIcons.ShoppingCart,
  PiggyBank: LucideIcons.PiggyBank,

  // Sports & Fitness
  Timer: LucideIcons.Timer,
};

interface TemplateIconProps {
  icon: string;
  size?: number;
  color?: string;
  sx?: SxProps<Theme>;
}

/**
 * Checks if a string is an emoji
 */
function isEmoji(str: string): boolean {
  const emojiRegex = /^[\p{Emoji}\u200d]+$/u;
  return emojiRegex.test(str) || str.length <= 2;
}

/**
 * Renders a template icon - either as a Lucide icon or as emoji/text
 */
export function TemplateIcon({ icon, size = 24, color, sx }: TemplateIconProps) {
  // Check if it's an emoji (emoji icons are short strings or contain emoji characters)
  if (isEmoji(icon)) {
    return (
      <Box
        component="span"
        sx={{
          fontSize: size,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...sx,
        }}
      >
        {icon}
      </Box>
    );
  }

  // Try to find Lucide icon
  const LucideIcon = ICON_MAP[icon];

  if (LucideIcon) {
    return (
      <Box
        component="span"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color || '#00ED64',
          ...sx,
        }}
      >
        <LucideIcon size={size} />
      </Box>
    );
  }

  // Fallback: display the icon name's first letter as a placeholder
  return (
    <Box
      component="span"
      sx={{
        fontSize: size * 0.8,
        fontWeight: 600,
        color: color || '#00ED64',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...sx,
      }}
    >
      {icon.charAt(0).toUpperCase()}
    </Box>
  );
}

export default TemplateIcon;
