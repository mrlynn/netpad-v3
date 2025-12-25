import { MongoClient, ObjectId } from 'mongodb';
import { FormResponse, FormSubmission } from '@/types/form';
import { getGlobalSubmissionsForForm } from './storage';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'form_builder';

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set');
}

/**
 * Convert FormSubmission to FormResponse format
 */
function submissionToResponse(submission: FormSubmission): FormResponse {
  return {
    _id: submission.id,
    formId: submission.formId,
    formVersion: submission.formVersion || 1,
    data: submission.data,
    status: submission.status,
    submittedAt: new Date(submission.submittedAt),
    startedAt: submission.startedAt ? new Date(submission.startedAt) : undefined,
    completedAt: submission.completedAt ? new Date(submission.completedAt) : undefined,
    completionTime: submission.completionTime,
    metadata: {
      userAgent: submission.metadata?.userAgent,
      ipAddress: submission.metadata?.ipAddress,
      referrer: submission.metadata?.referrer,
      deviceType: submission.metadata?.deviceType,
    },
  };
}

interface ResponseFilters {
  status?: 'submitted' | 'draft' | 'incomplete';
  dateRange?: { start: Date; end: Date };
  deviceType?: 'mobile' | 'desktop' | 'tablet';
  fieldFilters?: Record<string, any>;
}

interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface ResponseListResult {
  responses: FormResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Save a form response to MongoDB
 */
export async function saveResponse(
  formId: string,
  data: Record<string, any>,
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    deviceType?: 'mobile' | 'desktop' | 'tablet';
    browser?: string;
    os?: string;
    referrer?: string;
    geolocation?: { lat: number; lng: number };
    startedAt?: Date;
    completedAt?: Date;
    completionTime?: number;
  },
  connectionString?: string
): Promise<FormResponse> {
  const mongoUri = connectionString || MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MongoDB connection string is required');
  }
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    const db = client.db(MONGODB_DATABASE);
    const collection = db.collection<FormResponse>('form_responses');

    const response: Omit<FormResponse, '_id'> = {
      formId,
      formVersion: 1, // TODO: Get from form config
      data,
      status: 'submitted',
      submittedAt: new Date(),
      startedAt: metadata.startedAt || new Date(),
      completedAt: metadata.completedAt || new Date(),
      completionTime: metadata.completionTime,
      metadata: {
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
        deviceType: metadata.deviceType,
        browser: metadata.browser,
        os: metadata.os,
        referrer: metadata.referrer,
        geolocation: metadata.geolocation,
      },
    };

    const result = await collection.insertOne(response as any);
    
    return {
      ...response,
      _id: result.insertedId.toString(),
    };
  } finally {
    await client.close();
  }
}

/**
 * Get responses for a form with filtering and pagination
 * Merges data from global_submissions (file storage) and form_responses (MongoDB) collections
 */
export async function getResponses(
  formId: string,
  filters: ResponseFilters = {},
  pagination: PaginationOptions = { page: 1, pageSize: 50 },
  connectionString?: string
): Promise<ResponseListResult> {
  let allResponses: FormResponse[] = [];

  // First, get submissions from global_submissions collection (file storage)
  try {
    const globalSubmissions = await getGlobalSubmissionsForForm(formId);
    const globalResponses = globalSubmissions.map(submissionToResponse);
    allResponses = [...globalResponses];
  } catch (err) {
    console.error('Error loading from global_submissions:', err);
  }

  // Then, get responses from form_responses collection (MongoDB with optional custom connection)
  const mongoUri = connectionString || MONGODB_URI;
  if (mongoUri) {
    const client = new MongoClient(mongoUri);

    try {
      await client.connect();
      const db = client.db(MONGODB_DATABASE);
      const collection = db.collection<FormResponse>('form_responses');

      // Build query
      const query: any = { formId };

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.dateRange) {
        query.submittedAt = {
          $gte: filters.dateRange.start,
          $lte: filters.dateRange.end,
        };
      }

      if (filters.deviceType) {
        query['metadata.deviceType'] = filters.deviceType;
      }

      // Field filters
      if (filters.fieldFilters) {
        Object.entries(filters.fieldFilters).forEach(([field, value]) => {
          query[`data.${field}`] = value;
        });
      }

      const mongoResponses = await collection.find(query).toArray();

      // Merge with global responses, avoiding duplicates by ID
      const existingIds = new Set(allResponses.map(r => r._id));
      for (const mongoResponse of mongoResponses) {
        const mongoId = mongoResponse._id?.toString();
        if (!existingIds.has(mongoId)) {
          allResponses.push({ ...mongoResponse, _id: mongoId });
        }
      }
    } catch (err) {
      console.error('Error loading from form_responses:', err);
    } finally {
      await client.close();
    }
  }

  // Apply filters to merged results
  let filteredResponses = allResponses;

  if (filters.status) {
    filteredResponses = filteredResponses.filter(r => r.status === filters.status);
  }

  if (filters.dateRange) {
    filteredResponses = filteredResponses.filter(r => {
      const date = new Date(r.submittedAt);
      return date >= filters.dateRange!.start && date <= filters.dateRange!.end;
    });
  }

  if (filters.deviceType) {
    filteredResponses = filteredResponses.filter(r => r.metadata?.deviceType === filters.deviceType);
  }

  // Sort
  const sortOrder = pagination.sortOrder === 'asc' ? 1 : -1;
  filteredResponses.sort((a, b) => {
    const aVal = pagination.sortBy ? (a as any)[pagination.sortBy] : a.submittedAt;
    const bVal = pagination.sortBy ? (b as any)[pagination.sortBy] : b.submittedAt;
    if (aVal < bVal) return -1 * sortOrder;
    if (aVal > bVal) return 1 * sortOrder;
    return 0;
  });

  // Paginate
  const total = filteredResponses.length;
  const skip = (pagination.page - 1) * pagination.pageSize;
  const paginatedResponses = filteredResponses.slice(skip, skip + pagination.pageSize);

  return {
    responses: paginatedResponses,
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.ceil(total / pagination.pageSize),
  };
}

/**
 * Get a single response by ID
 */
export async function getResponse(
  responseId: string,
  connectionString?: string
): Promise<FormResponse | null> {
  const mongoUri = connectionString || MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MongoDB connection string is required');
  }
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    const db = client.db(MONGODB_DATABASE);
    const collection = db.collection<FormResponse>('form_responses');

    let objectId: ObjectId;
    try {
      objectId = new ObjectId(responseId);
    } catch {
      return null;
    }
    const response = await collection.findOne({ _id: objectId } as any);
    
    if (!response) {
      return null;
    }

    return {
      ...response,
      _id: response._id.toString(),
    };
  } finally {
    await client.close();
  }
}

/**
 * Delete a response
 */
export async function deleteResponse(
  responseId: string,
  connectionString?: string
): Promise<boolean> {
  const mongoUri = connectionString || MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MongoDB connection string is required');
  }
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    const db = client.db(MONGODB_DATABASE);
    const collection = db.collection('form_responses');

    let objectId: ObjectId;
    try {
      objectId = new ObjectId(responseId);
    } catch {
      return false;
    }
    const result = await collection.deleteOne({ _id: objectId } as any);
    
    return result.deletedCount > 0;
  } finally {
    await client.close();
  }
}

/**
 * Update a response
 */
export async function updateResponse(
  responseId: string,
  updates: Partial<FormResponse>,
  connectionString?: string
): Promise<FormResponse | null> {
  const mongoUri = connectionString || MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MongoDB connection string is required');
  }
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    const db = client.db(MONGODB_DATABASE);
    const collection = db.collection<FormResponse>('form_responses');

    // Remove _id from updates if present
    const { _id, ...updateData } = updates as any;
    
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(responseId);
    } catch {
      return null;
    }
    
    const result = await collection.findOneAndUpdate(
      { _id: objectId } as any,
      { $set: updateData },
      { returnDocument: 'after' }
    );
    
    if (!result) {
      return null;
    }

    return {
      ...result,
      _id: result._id.toString(),
    };
  } finally {
    await client.close();
  }
}

/**
 * Get basic response statistics
 * Merges data from global_submissions and form_responses collections
 */
export async function getResponseStats(
  formId: string,
  connectionString?: string
): Promise<{
  total: number;
  submitted: number;
  draft: number;
  incomplete: number;
  averageCompletionTime: number;
}> {
  let allResponses: FormResponse[] = [];

  // First, get submissions from global_submissions collection
  try {
    const globalSubmissions = await getGlobalSubmissionsForForm(formId);
    const globalResponses = globalSubmissions.map(submissionToResponse);
    allResponses = [...globalResponses];
  } catch (err) {
    console.error('Error loading stats from global_submissions:', err);
  }

  // Then, get responses from form_responses collection
  const mongoUri = connectionString || MONGODB_URI;
  if (mongoUri) {
    const client = new MongoClient(mongoUri);

    try {
      await client.connect();
      const db = client.db(MONGODB_DATABASE);
      const collection = db.collection<FormResponse>('form_responses');

      const mongoResponses = await collection.find({ formId }).toArray();

      // Merge with global responses, avoiding duplicates by ID
      const existingIds = new Set(allResponses.map(r => r._id));
      for (const mongoResponse of mongoResponses) {
        const mongoId = mongoResponse._id?.toString();
        if (!existingIds.has(mongoId)) {
          allResponses.push({ ...mongoResponse, _id: mongoId });
        }
      }
    } catch (err) {
      console.error('Error loading stats from form_responses:', err);
    } finally {
      await client.close();
    }
  }

  // Calculate stats from merged responses
  const total = allResponses.length;
  const submitted = allResponses.filter(r => r.status === 'submitted').length;
  const draft = allResponses.filter(r => r.status === 'draft').length;
  const incomplete = allResponses.filter(r => r.status === 'incomplete').length;

  const completionTimes = allResponses
    .map(r => r.completionTime)
    .filter((t): t is number => t !== null && t !== undefined);

  const averageCompletionTime = completionTimes.length > 0
    ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
    : 0;

  return {
    total,
    submitted,
    draft,
    incomplete,
    averageCompletionTime,
  };
}
