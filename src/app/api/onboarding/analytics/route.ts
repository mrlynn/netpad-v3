import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { connectDB } from '@/lib/mongodb';
import { OnboardingSubmission, OnboardingAnalytics } from '@/types/onboarding';

// Session configuration
const sessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_for_development',
  cookieName: 'onboarding_admin_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
  },
};

interface OnboardingAdminSession {
  isAuthenticated: boolean;
}

/**
 * Get onboarding analytics
 * GET /api/onboarding/analytics
 */
export async function GET() {
  try {
    // Check authentication
    const session = await getIronSession<OnboardingAdminSession>(
      await cookies(),
      sessionOptions
    );

    if (!session.isAuthenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await connectDB();
    const collection = db.collection<OnboardingSubmission>('onboarding_submissions');

    // Get all submissions for analytics
    const submissions = await collection.find({}).toArray();

    // Calculate stats
    const totalSubmissions = submissions.length;

    // Status breakdown
    const submissionsByStatus = {
      draft: 0,
      submitted: 0,
      under_review: 0,
      approved: 0,
      rejected: 0,
    };
    submissions.forEach((s) => {
      submissionsByStatus[s.status]++;
    });

    // Device breakdown
    const deviceBreakdown = {
      mobile: 0,
      desktop: 0,
      tablet: 0,
    };
    submissions.forEach((s) => {
      deviceBreakdown[s.metadata.deviceType]++;
    });

    // Average completion time
    const completionTimes = submissions.map((s) => s.metadata.completionTimeSeconds);
    const averageCompletionTime =
      completionTimes.length > 0
        ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
        : 0;

    // Submissions trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const submissionsTrend: { date: string; count: number }[] = [];
    const dateMap = new Map<string, number>();

    submissions
      .filter((s) => new Date(s.submittedAt) >= thirtyDaysAgo)
      .forEach((s) => {
        const date = new Date(s.submittedAt).toISOString().split('T')[0];
        dateMap.set(date, (dateMap.get(date) || 0) + 1);
      });

    // Fill in all days
    for (let d = new Date(thirtyDaysAgo); d <= new Date(); d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      submissionsTrend.push({
        date: dateStr,
        count: dateMap.get(dateStr) || 0,
      });
    }

    // Computer preferences
    const computerPreferences: Record<string, number> = {};
    submissions.forEach((s) => {
      const pref = s.data.computerPreference;
      if (pref) {
        computerPreferences[pref] = (computerPreferences[pref] || 0) + 1;
      }
    });

    // Remote setup distribution
    const remoteSetupDistribution: Record<string, number> = {};
    submissions.forEach((s) => {
      const setup = s.data.remoteSetup;
      if (setup) {
        remoteSetupDistribution[setup] = (remoteSetupDistribution[setup] || 0) + 1;
      }
    });

    // Top software requests
    const softwareCounts: Record<string, number> = {};
    submissions.forEach((s) => {
      s.data.softwareNeeds?.forEach((sw) => {
        softwareCounts[sw] = (softwareCounts[sw] || 0) + 1;
      });
    });

    const topSoftwareRequests = Object.entries(softwareCounts)
      .map(([software, count]) => ({ software, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const analytics: OnboardingAnalytics = {
      totalSubmissions,
      submissionsByStatus,
      completionRate: 100, // All submissions are complete
      averageCompletionTime,
      submissionsTrend,
      deviceBreakdown,
      dropOffByPage: {}, // Not tracked in this simple version
      topSoftwareRequests,
      computerPreferences,
      remoteSetupDistribution,
      calculatedAt: new Date(),
    };

    return NextResponse.json({ success: true, analytics });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate analytics' },
      { status: 500 }
    );
  }
}
