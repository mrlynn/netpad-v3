/**
 * NetPad Collaborate Extension Types
 *
 * Type definitions for the collaborate extension services and data structures.
 */

/**
 * Collaborator submission data
 */
export interface CollaboratorSubmission {
  /** Unique submission ID */
  submissionId: string;
  /** Submitter's name */
  name: string;
  /** Submitter's email */
  email: string;
  /** Selected collaboration lane */
  lane: 'product' | 'engineering' | 'integrations' | 'not_sure';
  /** What they've shipped/built */
  shipped?: string;
  /** Why they're interested in NetPad */
  whyNetpad?: string;
  /** Weekly availability */
  availability?: string;
  /** Location/timezone */
  location?: string;
  /** Links to work samples */
  workLinks?: string;
  /** Submission timestamp */
  submittedAt: Date;
  /** Submission source (form or conversational) */
  source: 'form' | 'conversational';
  /** Conversation metadata if applicable */
  conversationMeta?: {
    conversationId: string;
    turnCount: number;
    confidence: number;
  };
  /** Review status */
  status: 'pending' | 'reviewed' | 'contacted' | 'declined';
  /** Internal notes */
  notes?: string;
}

/**
 * Gallery item for community showcase
 */
export interface GalleryItem {
  /** Unique item ID */
  id: string;
  /** Item title */
  title: string;
  /** Description */
  description: string;
  /** Category */
  category: 'template' | 'workflow' | 'integration' | 'app';
  /** Author information */
  author: {
    name: string;
    avatar?: string;
    githubUrl?: string;
  };
  /** Thumbnail image URL */
  thumbnailUrl?: string;
  /** Demo URL */
  demoUrl?: string;
  /** Source code URL */
  sourceUrl?: string;
  /** Tags for filtering */
  tags: string[];
  /** Creation date */
  createdAt: Date;
  /** Featured flag */
  featured: boolean;
  /** View count */
  views: number;
  /** Like count */
  likes: number;
}

/**
 * Contributor profile
 */
export interface Contributor {
  /** Unique contributor ID */
  id: string;
  /** Display name */
  name: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** GitHub username */
  githubUsername?: string;
  /** Contribution count */
  contributions: number;
  /** Contribution types */
  contributionTypes: ('code' | 'docs' | 'templates' | 'workflows' | 'design')[];
  /** Join date */
  joinedAt: Date;
  /** Bio */
  bio?: string;
}

/**
 * Collaborate service interface
 */
export interface CollaborateService {
  /**
   * Submit a collaboration application
   */
  submitApplication(data: Omit<CollaboratorSubmission, 'submissionId' | 'submittedAt' | 'status'>): Promise<{
    success: boolean;
    submissionId: string;
    message?: string;
  }>;

  /**
   * Get gallery items
   */
  getGalleryItems(options?: {
    category?: GalleryItem['category'];
    tags?: string[];
    featured?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{
    items: GalleryItem[];
    total: number;
  }>;

  /**
   * Get contributor leaderboard
   */
  getContributors(options?: {
    limit?: number;
    offset?: number;
  }): Promise<{
    contributors: Contributor[];
    total: number;
  }>;

  /**
   * Send notification for new submission
   */
  sendNotification(submission: CollaboratorSubmission): Promise<void>;
}

/**
 * Notification payload for new collaborator submissions
 */
export interface CollaboratorNotificationPayload {
  name: string;
  email: string;
  lane: string;
  shipped?: string;
  whyNetpad?: string;
  availability?: string;
  location?: string;
  workLinks?: string;
  conversationId?: string;
  turnCount?: number;
}
