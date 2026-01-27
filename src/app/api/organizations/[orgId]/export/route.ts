import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { assertOrgPermission } from '@/lib/platform/permissions';
import { getOrgDb } from '@/lib/platform/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getSession();
    const { orgId } = await params;

    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const formId = searchParams.get('formId'); // Optional: export specific form

    // Check permission
    try {
      await assertOrgPermission(session.userId, orgId, 'read_submissions');
    } catch {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Get org database
    const db = await getOrgDb(orgId);
    if (!db) {
      return NextResponse.json({ error: 'Organization database not found' }, { status: 404 });
    }

    // Build query
    const query: any = {};
    if (formId) {
      query.formId = formId;
    }

    // Get all submissions
    const submissions = await db
      .collection('submissions')
      .find(query)
      .sort({ submittedAt: -1 })
      .toArray();

    // Get all forms for context
    const forms = await db
      .collection('forms')
      .find({})
      .toArray();

    const exportData = {
      exportedAt: new Date().toISOString(),
      organizationId: orgId,
      totalSubmissions: submissions.length,
      totalForms: forms.length,
      forms: forms.map(form => ({
        formId: form.formId,
        title: form.title,
        description: form.description,
        createdAt: form.createdAt,
        fields: form.fields,
      })),
      submissions: submissions.map(sub => ({
        submissionId: sub.submissionId || sub._id?.toString(),
        formId: sub.formId,
        data: sub.data,
        submittedAt: sub.submittedAt,
        metadata: {
          ip: sub.metadata?.ip ? '[redacted]' : undefined,
          userAgent: sub.metadata?.userAgent,
          source: sub.metadata?.source,
        },
      })),
    };

    if (format === 'csv') {
      // Convert to CSV format
      const csvRows: string[] = [];

      // Create header row with all possible fields
      const allFields = new Set<string>();
      allFields.add('submissionId');
      allFields.add('formId');
      allFields.add('submittedAt');

      submissions.forEach(sub => {
        if (sub.data && typeof sub.data === 'object') {
          Object.keys(sub.data).forEach(key => allFields.add(`data.${key}`));
        }
      });

      const headers = Array.from(allFields);
      csvRows.push(headers.join(','));

      // Add data rows
      submissions.forEach(sub => {
        const row = headers.map(header => {
          if (header === 'submissionId') return sub.submissionId || sub._id?.toString() || '';
          if (header === 'formId') return sub.formId || '';
          if (header === 'submittedAt') return sub.submittedAt?.toISOString() || '';
          if (header.startsWith('data.')) {
            const field = header.replace('data.', '');
            const value = sub.data?.[field];
            if (value === undefined || value === null) return '';
            if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
            return String(value).replace(/"/g, '""');
          }
          return '';
        });
        csvRows.push(row.map(v => `"${v}"`).join(','));
      });

      const csvContent = csvRows.join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="form-data-export-${orgId}.csv"`,
        },
      });
    }

    // Default: JSON format
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="form-data-export-${orgId}.json"`,
      },
    });
  } catch (error: any) {
    console.error('[Export API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Export failed' },
      { status: 500 }
    );
  }
}
