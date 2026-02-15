/**
 * Mock MongoDB client for testing
 * Provides a mock implementation of the MongoDB Node.js driver
 */

export class MongoClient {
  private uri: string;
  private connected = false;

  constructor(uri: string) {
    this.uri = uri;
  }

  async connect(): Promise<MongoClient> {
    this.connected = true;
    return this;
  }

  async close(): Promise<void> {
    this.connected = false;
  }

  db(name?: string): MockDatabase {
    return new MockDatabase(name || 'test');
  }
}

class MockDatabase {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  collection<T = any>(name: string): MockCollection<T> {
    return new MockCollection<T>(name);
  }

  listCollections(): MockCursor {
    return new MockCursor([]);
  }
}

class MockCollection<T = any> {
  private name: string;
  private mockData: T[] = [];

  constructor(name: string) {
    this.name = name;
  }

  find(query?: any): MockCursor<T> {
    return new MockCursor<T>(this.mockData);
  }

  findOne(query?: any): Promise<T | null> {
    return Promise.resolve(null);
  }

  findOneAndUpdate(filter: any, update: any, options?: any): Promise<T | null> {
    return Promise.resolve(null);
  }

  findOneAndDelete(filter: any, options?: any): Promise<T | null> {
    return Promise.resolve(null);
  }

  insertOne(doc: T): Promise<{ insertedId: string; acknowledged: boolean }> {
    return Promise.resolve({
      insertedId: 'mock-id-' + Date.now(),
      acknowledged: true,
    });
  }

  insertMany(docs: T[]): Promise<{ insertedIds: Record<number, string>; acknowledged: boolean }> {
    const ids: Record<number, string> = {};
    docs.forEach((_, i) => {
      ids[i] = 'mock-id-' + Date.now() + '-' + i;
    });
    return Promise.resolve({
      insertedIds: ids,
      acknowledged: true,
    });
  }

  updateOne(filter: any, update: any): Promise<{ matchedCount: number; modifiedCount: number; acknowledged: boolean }> {
    return Promise.resolve({
      matchedCount: 1,
      modifiedCount: 1,
      acknowledged: true,
    });
  }

  updateMany(filter: any, update: any): Promise<{ matchedCount: number; modifiedCount: number; acknowledged: boolean }> {
    return Promise.resolve({
      matchedCount: 0,
      modifiedCount: 0,
      acknowledged: true,
    });
  }

  deleteOne(filter: any): Promise<{ deletedCount: number; acknowledged: boolean }> {
    return Promise.resolve({
      deletedCount: 1,
      acknowledged: true,
    });
  }

  deleteMany(filter: any): Promise<{ deletedCount: number; acknowledged: boolean }> {
    return Promise.resolve({
      deletedCount: 0,
      acknowledged: true,
    });
  }

  countDocuments(query?: any): Promise<number> {
    return Promise.resolve(0);
  }

  aggregate(pipeline: any[]): MockCursor<T> {
    return new MockCursor<T>([]);
  }
}

class MockCursor<T = any> {
  private data: T[];

  constructor(data: T[]) {
    this.data = data;
  }

  toArray(): Promise<T[]> {
    return Promise.resolve(this.data);
  }

  limit(n: number): MockCursor<T> {
    return new MockCursor<T>(this.data.slice(0, n));
  }

  skip(n: number): MockCursor<T> {
    return new MockCursor<T>(this.data.slice(n));
  }

  sort(spec: any): MockCursor<T> {
    return this;
  }

  project(spec: any): MockCursor<T> {
    return this;
  }
}

// Export ObjectId mock
export class ObjectId {
  private id: string;

  constructor(id?: string) {
    this.id = id || this.generateId();
  }

  private generateId(): string {
    const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
    const random = Math.random().toString(16).substring(2, 18).padStart(16, '0');
    return timestamp + random;
  }

  toString(): string {
    return this.id;
  }

  toHexString(): string {
    return this.id;
  }

  equals(other: ObjectId | string): boolean {
    const otherId = typeof other === 'string' ? other : other.toString();
    return this.id === otherId;
  }

  static isValid(id: string): boolean {
    return /^[a-f0-9]{24}$/i.test(id);
  }

  static createFromTime(time: number): ObjectId {
    const hexTime = Math.floor(time).toString(16).padStart(8, '0');
    return new ObjectId(hexTime + '0'.repeat(16));
  }
}
