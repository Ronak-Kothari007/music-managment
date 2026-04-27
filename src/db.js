const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const dbName = process.env.MONGODB_DB || 'music_app_management';

let client;
let database;

async function connectToDatabase() {
  if (database) {
    return database;
  }

  client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  database = client.db(dbName);
  await createIndexes(database);
  return database;
}

async function createIndexes(db) {
  try {
    await db.collection('songs').dropIndex('title_text_genre_1');
  } catch (error) {
    if (error.codeName !== 'IndexNotFound') {
      throw error;
    }
  }

  await Promise.all([
    db.collection('artists').createIndex({ name: 1 }, { unique: true }),
    db.collection('albums').createIndex({ title: 1, artistId: 1 }),
    db.collection('songs').createIndex(
      { title: 'text', genre: 1 },
      { language_override: 'textLanguage' }
    ),
    db.collection('songs').createIndex({ artistId: 1, albumId: 1 }),
    db.collection('playlists').createIndex({ name: 1 }, { unique: true }),
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
    db.collection('listens').createIndex({ songId: 1, listenedAt: -1 }),
    db.collection('listens').createIndex({ userId: 1, listenedAt: -1 })
  ]);
}

function toObjectId(value, fieldName = 'id') {
  if (value instanceof ObjectId) {
    return value;
  }

  if (!ObjectId.isValid(value)) {
    const error = new Error(`Invalid ${fieldName}`);
    error.status = 400;
    throw error;
  }

  return new ObjectId(value);
}

async function closeDatabase() {
  if (client) {
    await client.close();
  }
  client = undefined;
  database = undefined;
}

module.exports = {
  connectToDatabase,
  closeDatabase,
  toObjectId,
  ObjectId
};
