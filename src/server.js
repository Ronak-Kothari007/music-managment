require('dotenv').config();

const path = require('path');
const cors = require('cors');
const express = require('express');

const { connectToDatabase, toObjectId } = require('./db');
const { seedDatabase } = require('./seed');

const app = express();
const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

function cleanString(value) {
  return String(value || '').trim();
}

function parseNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asyncRoute(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

async function requireDocument(db, collection, id, label) {
  const objectId = toObjectId(id, label);
  const document = await db.collection(collection).findOne({ _id: objectId });
  if (!document) {
    const error = new Error(`${label} not found`);
    error.status = 404;
    throw error;
  }
  return document;
}

function artistPayload(body) {
  return {
    name: cleanString(body.name),
    country: cleanString(body.country),
    genre: cleanString(body.genre),
    monthlyListeners: parseNumber(body.monthlyListeners)
  };
}

function albumPayload(body) {
  return {
    title: cleanString(body.title),
    artistId: toObjectId(body.artistId, 'artistId'),
    releaseYear: parseNumber(body.releaseYear),
    label: cleanString(body.label)
  };
}

function songPayload(body) {
  return {
    title: cleanString(body.title),
    artistId: toObjectId(body.artistId, 'artistId'),
    albumId: toObjectId(body.albumId, 'albumId'),
    genre: cleanString(body.genre),
    durationSeconds: parseNumber(body.durationSeconds),
    language: cleanString(body.language),
    explicit: Boolean(body.explicit),
    streams: parseNumber(body.streams)
  };
}

function userPayload(body) {
  return {
    name: cleanString(body.name),
    email: cleanString(body.email).toLowerCase(),
    plan: cleanString(body.plan),
    status: cleanString(body.status),
    joinedAt: body.joinedAt ? new Date(body.joinedAt) : new Date()
  };
}

function playlistPayload(body) {
  return {
    name: cleanString(body.name),
    description: cleanString(body.description),
    ownerId: toObjectId(body.ownerId, 'ownerId'),
    visibility: cleanString(body.visibility) || 'Private',
    songIds: Array.isArray(body.songIds)
      ? body.songIds.filter(Boolean).map((songId) => toObjectId(songId, 'songId'))
      : []
  };
}

function assertRequired(payload, requiredFields) {
  for (const field of requiredFields) {
    if (payload[field] === '' || payload[field] === undefined || payload[field] === null) {
      const error = new Error(`${field} is required`);
      error.status = 400;
      throw error;
    }
  }
}

async function findWithRelations(db, collectionName) {
  const lookups = {
    albums: [
      { $lookup: { from: 'artists', localField: 'artistId', foreignField: '_id', as: 'artist' } },
      { $unwind: { path: '$artist', preserveNullAndEmptyArrays: true } },
      { $sort: { releaseYear: -1, title: 1 } }
    ],
    songs: [
      { $lookup: { from: 'artists', localField: 'artistId', foreignField: '_id', as: 'artist' } },
      { $unwind: { path: '$artist', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'albums', localField: 'albumId', foreignField: '_id', as: 'album' } },
      { $unwind: { path: '$album', preserveNullAndEmptyArrays: true } },
      { $sort: { streams: -1, title: 1 } }
    ],
    playlists: [
      { $lookup: { from: 'users', localField: 'ownerId', foreignField: '_id', as: 'owner' } },
      { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'songs', localField: 'songIds', foreignField: '_id', as: 'songs' } },
      { $sort: { name: 1 } }
    ]
  };

  if (!lookups[collectionName]) {
    return db.collection(collectionName).find({}).sort({ name: 1, title: 1 }).toArray();
  }

  return db.collection(collectionName).aggregate(lookups[collectionName]).toArray();
}

app.get('/api/health', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  await db.command({ ping: 1 });
  res.json({ ok: true, database: db.databaseName });
}));

app.post('/api/seed', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  const counts = await seedDatabase(db);
  res.json({ message: 'Database seeded', counts });
}));

app.get('/api/summary', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  const [artists, albums, songs, users, playlists, listens, topSongs] = await Promise.all([
    db.collection('artists').countDocuments(),
    db.collection('albums').countDocuments(),
    db.collection('songs').countDocuments(),
    db.collection('users').countDocuments(),
    db.collection('playlists').countDocuments(),
    db.collection('listens').countDocuments(),
    db.collection('songs').aggregate([
      { $sort: { streams: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'artists', localField: 'artistId', foreignField: '_id', as: 'artist' } },
      { $unwind: { path: '$artist', preserveNullAndEmptyArrays: true } }
    ]).toArray()
  ]);

  res.json({
    counts: { artists, albums, songs, users, playlists, listens },
    topSongs
  });
}));

app.get('/api/reports/top-songs', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  const report = await db.collection('listens').aggregate([
    { $group: { _id: '$songId', plays: { $sum: 1 }, lastPlayed: { $max: '$listenedAt' } } },
    { $sort: { plays: -1, lastPlayed: -1 } },
    { $limit: 10 },
    { $lookup: { from: 'songs', localField: '_id', foreignField: '_id', as: 'song' } },
    { $unwind: '$song' },
    { $lookup: { from: 'artists', localField: 'song.artistId', foreignField: '_id', as: 'artist' } },
    { $unwind: { path: '$artist', preserveNullAndEmptyArrays: true } }
  ]).toArray();

  res.json(report);
}));

app.post('/api/listens', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  const userId = toObjectId(req.body.userId, 'userId');
  const songId = toObjectId(req.body.songId, 'songId');
  await requireDocument(db, 'users', userId, 'user');
  await requireDocument(db, 'songs', songId, 'song');
  const listen = { userId, songId, listenedAt: new Date() };
  const result = await db.collection('listens').insertOne(listen);
  await db.collection('songs').updateOne({ _id: songId }, { $inc: { streams: 1 } });
  res.status(201).json({ ...listen, _id: result.insertedId });
}));

app.get('/api/artists', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  res.json(await findWithRelations(db, 'artists'));
}));

app.post('/api/artists', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  const payload = artistPayload(req.body);
  assertRequired(payload, ['name', 'country', 'genre']);
  const result = await db.collection('artists').insertOne(payload);
  res.status(201).json({ ...payload, _id: result.insertedId });
}));

app.put('/api/artists/:id', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  const _id = toObjectId(req.params.id);
  const payload = artistPayload(req.body);
  assertRequired(payload, ['name', 'country', 'genre']);
  await db.collection('artists').updateOne({ _id }, { $set: payload });
  res.json({ ...payload, _id });
}));

app.delete('/api/artists/:id', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  const _id = toObjectId(req.params.id);
  const dependentSongs = await db.collection('songs').countDocuments({ artistId: _id });
  if (dependentSongs > 0) {
    return res.status(409).json({ message: 'Delete this artist only after removing their songs.' });
  }
  await db.collection('albums').deleteMany({ artistId: _id });
  await db.collection('artists').deleteOne({ _id });
  res.status(204).end();
}));

app.get('/api/albums', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  res.json(await findWithRelations(db, 'albums'));
}));

app.post('/api/albums', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  const payload = albumPayload(req.body);
  assertRequired(payload, ['title', 'artistId', 'releaseYear']);
  await requireDocument(db, 'artists', payload.artistId, 'artist');
  const result = await db.collection('albums').insertOne(payload);
  res.status(201).json({ ...payload, _id: result.insertedId });
}));

app.put('/api/albums/:id', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  const _id = toObjectId(req.params.id);
  const payload = albumPayload(req.body);
  assertRequired(payload, ['title', 'artistId', 'releaseYear']);
  await requireDocument(db, 'artists', payload.artistId, 'artist');
  await db.collection('albums').updateOne({ _id }, { $set: payload });
  res.json({ ...payload, _id });
}));

app.delete('/api/albums/:id', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  const _id = toObjectId(req.params.id);
  const dependentSongs = await db.collection('songs').countDocuments({ albumId: _id });
  if (dependentSongs > 0) {
    return res.status(409).json({ message: 'Delete this album only after removing its songs.' });
  }
  await db.collection('albums').deleteOne({ _id });
  res.status(204).end();
}));

app.get('/api/songs', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  res.json(await findWithRelations(db, 'songs'));
}));

app.post('/api/songs', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  const payload = songPayload(req.body);
  assertRequired(payload, ['title', 'artistId', 'albumId', 'genre', 'durationSeconds']);
  await requireDocument(db, 'artists', payload.artistId, 'artist');
  await requireDocument(db, 'albums', payload.albumId, 'album');
  const result = await db.collection('songs').insertOne(payload);
  res.status(201).json({ ...payload, _id: result.insertedId });
}));

app.put('/api/songs/:id', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  const _id = toObjectId(req.params.id);
  const payload = songPayload(req.body);
  assertRequired(payload, ['title', 'artistId', 'albumId', 'genre', 'durationSeconds']);
  await requireDocument(db, 'artists', payload.artistId, 'artist');
  await requireDocument(db, 'albums', payload.albumId, 'album');
  await db.collection('songs').updateOne({ _id }, { $set: payload });
  res.json({ ...payload, _id });
}));

app.delete('/api/songs/:id', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  const _id = toObjectId(req.params.id);
  await Promise.all([
    db.collection('songs').deleteOne({ _id }),
    db.collection('playlists').updateMany({}, { $pull: { songIds: _id } }),
    db.collection('listens').deleteMany({ songId: _id })
  ]);
  res.status(204).end();
}));

app.get('/api/users', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  const users = await db.collection('users').find({}).sort({ joinedAt: -1 }).toArray();
  res.json(users);
}));

app.post('/api/users', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  const payload = userPayload(req.body);
  assertRequired(payload, ['name', 'email', 'plan', 'status']);
  const result = await db.collection('users').insertOne(payload);
  res.status(201).json({ ...payload, _id: result.insertedId });
}));

app.put('/api/users/:id', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  const _id = toObjectId(req.params.id);
  const payload = userPayload(req.body);
  assertRequired(payload, ['name', 'email', 'plan', 'status']);
  await db.collection('users').updateOne({ _id }, { $set: payload });
  res.json({ ...payload, _id });
}));

app.delete('/api/users/:id', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  const _id = toObjectId(req.params.id);
  await Promise.all([
    db.collection('users').deleteOne({ _id }),
    db.collection('playlists').deleteMany({ ownerId: _id }),
    db.collection('listens').deleteMany({ userId: _id })
  ]);
  res.status(204).end();
}));

app.get('/api/playlists', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  res.json(await findWithRelations(db, 'playlists'));
}));

app.post('/api/playlists', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  const payload = playlistPayload(req.body);
  assertRequired(payload, ['name', 'ownerId', 'visibility']);
  await requireDocument(db, 'users', payload.ownerId, 'owner');
  const result = await db.collection('playlists').insertOne(payload);
  res.status(201).json({ ...payload, _id: result.insertedId });
}));

app.put('/api/playlists/:id', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  const _id = toObjectId(req.params.id);
  const payload = playlistPayload(req.body);
  assertRequired(payload, ['name', 'ownerId', 'visibility']);
  await requireDocument(db, 'users', payload.ownerId, 'owner');
  await db.collection('playlists').updateOne({ _id }, { $set: payload });
  res.json({ ...payload, _id });
}));

app.delete('/api/playlists/:id', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  await db.collection('playlists').deleteOne({ _id: toObjectId(req.params.id) });
  res.status(204).end();
}));

app.use((error, req, res, next) => {
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEOUT' || error.code === 'querySrv') {
    return res.status(503).json({
      message: 'Database connection failed. Check MongoDB Atlas network access, connection string, and internet/DNS connectivity.'
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({ message: 'A record with this unique value already exists.' });
  }

  const status = error.status || 500;
  res.status(status).json({ message: error.message || 'Server error' });
});

app.listen(port, host, () => {
  console.log(`Music App Management System running at http://127.0.0.1:${port}`);
  connectToDatabase()
    .then(() => console.log('MongoDB connected.'))
    .catch((error) => {
      console.warn('MongoDB is not connected yet:', error.message);
      console.warn('The frontend will load, but API data needs MongoDB Atlas access.');
    });
});
