import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { connectDB } from '@/lib/mongodb';
import {
  OnboardingSubmission,
  OnboardingStatus,
  ListSubmissionsParams,
  ListSubmissionsResponse,
} from '@/types/onboarding';

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
 * List onboarding submissions
 * GET /api/onboarding/submissions
 */
export async function GET(request: NextRequest): Promise<NextResponse<ListSubmissionsResponse>> {
  try {
    // Check authentication
    const session = await getIronSession<OnboardingAdminSession>(
      await cookies(),
      sessionOptions
    );

    if (!session.isAuthenticated) {
      return NextResponse.json(
        { success: false, submissions: [], total: 0, page: 1, pageSize: 20, totalPages: 0 } as ListSubmissionsResponse,
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const params: ListSubmissionsParams = {
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
      status: searchParams.get('status') as OnboardingStatus | undefined,
      search: searchParams.get('search') || undefined,
      sortBy: (searchParams.get('sortBy') as ListSubmissionsParams['sortBy']) || 'submittedAt',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    };

    // Build query
    const query: Record<string, any> = {};

    if (params.status) {
      query.status = params.status;
    }

    if (params.search) {
      const searchRegex = { $regex: params.search, $options: 'i' };
      query.$or = [
        { 'data.firstName': searchRegex },
        { 'data.lastName': searchRegex },
        { 'data.email': searchRegex },
        { submissionId: searchRegex },
      ];
    }

    if (params.startDate || params.endDate) {
      query.submittedAt = {};
      if (params.startDate) {
        query.submittedAt.$gte = new Date(params.startDate);
      }
      if (params.endDate) {
        query.submittedAt.$lte = new Date(params.endDate);
      }
    }

    // Build sort
    const sortField = params.sortBy === 'lastName' ? 'data.lastName' : params.sortBy;
    const sort: Record<string, 1 | -1> = {
      [sortField || 'submittedAt']: params.sortOrder === 'asc' ? 1 : -1,
    };

    // Connect to database
    const db = await connectDB();
    const collection = db.collection<OnboardingSubmission>('onboarding_submissions');

    // Get total count
    const total = await collection.countDocuments(query);

    // Calculate pagination
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
    const totalPages = Math.ceil(total / pageSize);
    const skip = (page - 1) * pageSize;

    // Fetch submissions
    const submissions = await collection
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(pageSize)
      .toArray();

    return NextResponse.json({
      success: true,
      submissions,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    console.error('List submissions error:', error);
    return NextResponse.json(
      {
        success: false,
        submissions: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      } as ListSubmissionsResponse,
      { status: 500 }
    );
  }
}
