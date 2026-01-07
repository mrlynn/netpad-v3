/**
 * Clear All Form Thumbnails Script
 *
 * This script removes all thumbnail URLs from forms in the database,
 * allowing them to be regenerated fresh when forms are next saved.
 *
 * Usage: npx ts-node scripts/clear-thumbnails.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || process.env.PLATFORM_MONGODB_URI;
const DATABASE_NAME = process.env.PLATFORM_DATABASE_NAME || 'form_builder_platform';

async function clearThumbnails() {
  if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI or PLATFORM_MONGODB_URI environment variable is required');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);

    console.log(`Connected to database: ${DATABASE_NAME}`);

    // Clear thumbnails from user_forms
    const userFormsCollection = db.collection('user_forms');
    const userFormsResult = await userFormsCollection.updateMany(
      { 'form.thumbnailUrl': { $exists: true } },
      {
        $unset: {
          'form.thumbnailUrl': '',
          'form.thumbnailUpdatedAt': '',
        },
        $set: {
          updatedAt: new Date(),
        },
      }
    );
    console.log(`Cleared thumbnails from ${userFormsResult.modifiedCount} user forms`);

    // Clear thumbnails from published_forms
    const publishedFormsCollection = db.collection('published_forms');
    const publishedFormsResult = await publishedFormsCollection.updateMany(
      { 'form.thumbnailUrl': { $exists: true } },
      {
        $unset: {
          'form.thumbnailUrl': '',
          'form.thumbnailUpdatedAt': '',
        },
        $set: {
          updatedAt: new Date(),
        },
      }
    );
    console.log(`Cleared thumbnails from ${publishedFormsResult.modifiedCount} published forms`);

    console.log('\nDone! Thumbnails will be regenerated when forms are saved.');

  } catch (error) {
    console.error('Error clearing thumbnails:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Database connection closed.');
  }
}

clearThumbnails();
