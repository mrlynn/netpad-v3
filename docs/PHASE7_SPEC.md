# Phase 7 Spec – Ratings & Reviews

**Date:** January 14, 2026  
**Author:** NetPad Applications-First initiative  
**Depends on:**  
- `docs/PHASE5_IMPLEMENTATION_STATUS.md` (Marketplace Publishing & Discovery) ✅
- `docs/PHASE6_IMPLEMENTATION_STATUS.md` (Marketplace Versioning) ✅

---

## 1. Purpose and Scope

**Phase 6** completed marketplace versioning and updates:
- ✅ Users can track installed applications
- ✅ Publishers can release new versions
- ✅ Users receive update notifications
- ✅ Upgrade workflows are functional

**Phase 7** adds social proof and quality signals:
- **User Ratings** - 1-5 star ratings for marketplace applications
- **Written Reviews** - Detailed feedback from users
- **Average Rating Display** - Aggregate ratings shown on listings
- **Filter/Sort by Rating** - Discover high-quality applications

> **Explicit Non-goals (Phase 7):**
> - No review moderation (deferred to future phase)
> - No verified purchase requirement (any user can review)
> - No review editing (users can delete and re-submit)
> - No review reactions (like/dislike) - deferred

---

## 2. High-level Outcomes

By the end of Phase 7:

1. **Users can rate applications**:
   - Submit 1-5 star ratings
   - Write detailed reviews
   - See their own review history

2. **Marketplace shows ratings**:
   - Average rating displayed on application cards
   - Star rating visualization
   - Review count badges
   - Rating distribution charts

3. **Users can discover by quality**:
   - Filter by minimum rating (e.g., 4+ stars)
   - Sort by rating (highest first)
   - Sort by review count (most reviewed)

4. **Application detail shows reviews**:
   - List of all reviews
   - Review pagination
   - Review helpfulness (future: upvote/downvote)

---

## 3. Core Concept: Application Reviews

### The Problem

Currently, marketplace applications have no quality signals:
- Users can't see if an application is good or bad
- No way to filter by quality
- No social proof for publishers

### The Solution

**Application Reviews Collection** stores:
- User ratings (1-5 stars)
- Written reviews (optional)
- Review metadata (date, helpfulness, etc.)
- Aggregated statistics (average rating, review count)

---

## 4. Data Model

### 4.1 Application Review (Platform Database)

**Collection:** `application_reviews` (in platform database)

```typescript
interface ApplicationReview {
  _id?: ObjectId;
  reviewId: string;                // "rev_abc123"
  marketplaceApplicationId: string; // ID from marketplace_applications
  userId: string;                  // User who wrote the review
  userName?: string;               // Snapshot of user name
  userEmail?: string;              // Snapshot of user email (optional)
  
  // Rating
  rating: number;                  // 1-5 stars
  title?: string;                  // Optional review title
  review?: string;                 // Optional written review text
  
  // Metadata
  helpfulCount?: number;           // Number of users who found this helpful (future)
  reportedCount?: number;          // Number of times reported (future)
  status: 'published' | 'hidden' | 'deleted';
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

**Indexes:**
```javascript
db.application_reviews.createIndex({ reviewId: 1 }, { unique: true });
db.application_reviews.createIndex({ marketplaceApplicationId: 1, status: 1 });
db.application_reviews.createIndex({ userId: 1 });
db.application_reviews.createIndex({ marketplaceApplicationId: 1, createdAt: -1 });
db.application_reviews.createIndex({ marketplaceApplicationId: 1, rating: 1 });
```

### 4.2 Marketplace Application Rating Stats

**Enhancement to existing `marketplace_applications` collection:**

```typescript
interface MarketplaceApplication {
  // ... existing fields ...
  
  // Rating statistics (computed/updated)
  stats: {
    downloads: number;
    rating?: number;               // Average rating (1-5)
    reviews: number;                // Total review count
    ratingDistribution?: {          // Rating breakdown
      '5': number;
      '4': number;
      '3': number;
      '2': number;
      '1': number;
    };
  };
}
```

---

## 5. API Endpoints

### 5.1 List Reviews

**Endpoint:** `GET /api/marketplace/applications/[id]/reviews`

**Query Parameters:**
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 10)
- `sortBy` - `'newest' | 'oldest' | 'rating' | 'helpful'` (default: 'newest')
- `minRating` - Filter by minimum rating (1-5)

**Response:**
```typescript
{
  reviews: ApplicationReview[];
  total: number;
  page: number;
  pageSize: number;
  averageRating: number;
  ratingDistribution: {
    '5': number;
    '4': number;
    '3': number;
    '2': number;
    '1': number;
  };
}
```

### 5.2 Create Review

**Endpoint:** `POST /api/marketplace/applications/[id]/reviews`

**Request:**
```typescript
{
  rating: number;        // 1-5, required
  title?: string;        // Optional
  review?: string;       // Optional
}
```

**Response:**
```typescript
{
  success: boolean;
  review: ApplicationReview;
  updatedStats: {
    averageRating: number;
    reviews: number;
  };
}
```

**Validation:**
- User must be authenticated
- Rating must be 1-5
- User can only have one review per application (update existing if exists)
- User must have installed the application (optional check)

### 5.3 Update Review

**Endpoint:** `PUT /api/marketplace/applications/[id]/reviews/[reviewId]`

**Request:**
```typescript
{
  rating?: number;
  title?: string;
  review?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  review: ApplicationReview;
  updatedStats: {
    averageRating: number;
    reviews: number;
  };
}
```

**Validation:**
- User must own the review
- Rating must be 1-5 if provided

### 5.4 Delete Review

**Endpoint:** `DELETE /api/marketplace/applications/[id]/reviews/[reviewId]`

**Response:**
```typescript
{
  success: boolean;
  updatedStats: {
    averageRating: number;
    reviews: number;
  };
}
```

**Validation:**
- User must own the review

### 5.5 Get User's Review

**Endpoint:** `GET /api/marketplace/applications/[id]/reviews/me`

**Response:**
```typescript
{
  review: ApplicationReview | null;
}
```

---

## 6. UI Surfaces

### 6.1 Rating Display Components

**Location:** Application cards, detail dialogs

**Components:**
- `RatingStars` - Visual star rating display (read-only)
- `RatingInput` - Star rating input (for reviews)
- `RatingSummary` - Average rating with count
- `RatingDistribution` - Bar chart showing rating breakdown

**Files:**
- `src/components/Marketplace/RatingStars.tsx` (new)
- `src/components/Marketplace/RatingInput.tsx` (new)
- `src/components/Marketplace/RatingSummary.tsx` (new)
- `src/components/Marketplace/RatingDistribution.tsx` (new)

### 6.2 Review Form

**Location:** Application detail dialog

**Features:**
- Star rating selector (1-5)
- Optional title field
- Optional review text (multiline)
- Submit button
- Edit/Delete existing review

**Component:** `src/components/Marketplace/ReviewForm.tsx` (new)

### 6.3 Reviews List

**Location:** Application detail dialog

**Features:**
- List of all reviews
- Pagination
- Sort options (newest, oldest, highest rating, lowest rating)
- Filter by rating
- Show user's own review first (if exists)
- Edit/Delete buttons for own reviews

**Component:** `src/components/Marketplace/ReviewsList.tsx` (new)

### 6.4 Marketplace Filtering

**Location:** Marketplace browse view

**Features:**
- Filter by minimum rating (dropdown: All, 4+, 3+, etc.)
- Sort by rating (highest first, lowest first)
- Sort by review count (most reviewed)
- Rating badges on application cards

**Enhancement to:** `src/components/Marketplace/MarketplaceView.tsx`

---

## 7. Implementation Plan

### 7.1 Backend (Week 1)

**Task 1: Reviews Collection**
- [ ] Create `application_reviews` collection schema
- [ ] Add indexes
- [ ] Create utility functions (`createReview`, `getReview`, `listReviews`, `updateReview`, `deleteReview`, `calculateRatingStats`)

**File:** `src/lib/platform/applicationReviews.ts` (new)

**Task 2: Reviews API**
- [ ] `GET /api/marketplace/applications/[id]/reviews` - List reviews
- [ ] `POST /api/marketplace/applications/[id]/reviews` - Create review
- [ ] `PUT /api/marketplace/applications/[id]/reviews/[reviewId]` - Update review
- [ ] `DELETE /api/marketplace/applications/[id]/reviews/[reviewId]` - Delete review
- [ ] `GET /api/marketplace/applications/[id]/reviews/me` - Get user's review

**File:** `src/app/api/marketplace/applications/[id]/reviews/route.ts` (new)
**File:** `src/app/api/marketplace/applications/[id]/reviews/[reviewId]/route.ts` (new)
**File:** `src/app/api/marketplace/applications/[id]/reviews/me/route.ts` (new)

**Task 3: Update Marketplace Stats**
- [ ] Update `stats.rating` and `stats.reviews` when reviews are created/updated/deleted
- [ ] Calculate `ratingDistribution` for detailed stats
- [ ] Update marketplace application document on review changes

**File:** `src/lib/platform/applicationReviews.ts`

### 7.2 UI Components (Week 1-2)

**Task 4: Rating Display Components**
- [ ] Create `RatingStars` component (read-only)
- [ ] Create `RatingInput` component (interactive)
- [ ] Create `RatingSummary` component
- [ ] Create `RatingDistribution` component

**Task 5: Review Form**
- [ ] Create `ReviewForm` component
- [ ] Handle create/update/delete
- [ ] Show existing review if user has one
- [ ] Validation and error handling

**Task 6: Reviews List**
- [ ] Create `ReviewsList` component
- [ ] Pagination
- [ ] Sort/filter options
- [ ] Display review cards with rating, title, text, author, date

**Task 7: Enhance Application Cards**
- [ ] Add rating display to `ApplicationCard`
- [ ] Show average rating and review count
- [ ] Star visualization

**Task 8: Enhance Marketplace View**
- [ ] Add rating filter dropdown
- [ ] Add sort by rating options
- [ ] Update application cards to show ratings

**Task 9: Enhance Application Detail Dialog**
- [ ] Add reviews section
- [ ] Integrate `ReviewForm` and `ReviewsList`
- [ ] Show rating summary at top

### 7.3 Integration (Week 2)

**Task 10: Update Marketplace APIs**
- [ ] Include rating stats in marketplace listing responses
- [ ] Update `GET /api/marketplace/applications` to support rating filters/sorts

**File:** `src/app/api/marketplace/applications/route.ts`

### 7.4 Testing & Documentation (Week 2)

**Task 11: Testing**
- [ ] Test review creation/update/delete
- [ ] Test rating calculation
- [ ] Test filtering and sorting
- [ ] Test pagination
- [ ] Test user can only have one review per app

**Task 12: Documentation**
- [ ] Update `PHASE7_IMPLEMENTATION_STATUS.md`
- [ ] Update `APPLICATIONS_ROADMAP.md`
- [ ] Add help topics for reviews

---

## 8. Design Decisions

### 8.1 One Review Per User

**Decision:** Each user can only have one review per application.

**Rationale:**
- Prevents spam
- Simpler UI (edit vs create new)
- More meaningful statistics

**Implementation:**
- Check for existing review on create
- Update existing review if found
- Allow delete and re-create

### 8.2 Rating Required, Review Optional

**Decision:** Rating (1-5 stars) is required, written review is optional.

**Rationale:**
- Lowers barrier to entry (quick rating)
- Still captures quality signal
- Written reviews provide additional value

**Implementation:**
- Rating field required in API
- Title and review text optional

### 8.3 Real-time Stats Updates

**Decision:** Update rating stats immediately when reviews change.

**Rationale:**
- Users see current ratings
- No delay or caching complexity
- Simpler implementation

**Implementation:**
- Recalculate stats on create/update/delete
- Update marketplace application document
- Return updated stats in API responses

### 8.4 No Review Moderation (Phase 7)

**Decision:** Defer review moderation to future phase.

**Rationale:**
- Faster to market
- Can add moderation later
- Focus on core functionality first

**Implementation:**
- All reviews published immediately
- Status field exists for future moderation
- Can add admin review later

---

## 9. Success Criteria

Phase 7 is complete when:

1. ✅ Users can submit 1-5 star ratings
2. ✅ Users can write optional reviews
3. ✅ Average ratings display on application cards
4. ✅ Reviews list shows all reviews with pagination
5. ✅ Users can filter/sort by rating
6. ✅ Users can edit/delete their own reviews
7. ✅ Rating stats update in real-time
8. ✅ All API endpoints work correctly
9. ✅ UI flows are intuitive and tested

---

## 10. Future Phases (Post Phase 7)

**Phase 8:** npm Integration
- Publish to npm registry
- Install from npm packages
- npm registry sync service

**Phase 9:** Contracts & Protection
- Application contract enforcement
- Locked vs editable components
- Breaking change detection

**Future Enhancements:**
- Review moderation
- Verified purchase badges
- Review helpfulness voting
- Review reactions (like/dislike)
- Review editing history

---

## 11. Summary

Phase 7 adds **ratings and reviews** to the marketplace, enabling:

- **Quality Signals:** Users can see which applications are highly rated
- **Social Proof:** Reviews help users make informed decisions
- **Discovery:** Filter and sort by quality
- **Feedback Loop:** Publishers get user feedback

This transforms the marketplace from a simple listing into a **trusted, community-driven platform** where quality rises to the top.

---

**Ready for Implementation:** January 14, 2026
