require('dotenv').config();

const { connectToDatabase, closeDatabase, ObjectId } = require('./db');

async function seedDatabase(db) {
  const artists = [
    {
      _id: new ObjectId(),
      name: 'Asha Rivers',
      country: 'India',
      genre: 'Indie Pop',
      monthlyListeners: 1842000
    },
    {
      _id: new ObjectId(),
      name: 'Neon Tabla',
      country: 'India',
      genre: 'Electronic Fusion',
      monthlyListeners: 924000
    },
    {
      _id: new ObjectId(),
      name: 'The Midnight Raag',
      country: 'United States',
      genre: 'Lo-fi',
      monthlyListeners: 618000
    },
    {
      _id: new ObjectId(),
      name: 'Sofia Vale',
      country: 'Spain',
      genre: 'Acoustic',
      monthlyListeners: 402000
    }
  ];

  const albums = [
    {
      _id: new ObjectId(),
      title: 'City Monsoon',
      artistId: artists[0]._id,
      releaseYear: 2024,
      label: 'Cloudline Records'
    },
    {
      _id: new ObjectId(),
      title: 'Circuit Sitar',
      artistId: artists[1]._id,
      releaseYear: 2025,
      label: 'Pulse Foundry'
    },
    {
      _id: new ObjectId(),
      title: 'After Hours Raga',
      artistId: artists[2]._id,
      releaseYear: 2023,
      label: 'Quiet Room'
    },
    {
      _id: new ObjectId(),
      title: 'Strings at Dawn',
      artistId: artists[3]._id,
      releaseYear: 2022,
      label: 'North Sea Audio'
    }
  ];

  const songs = [
    {
      _id: new ObjectId(),
      title: 'Rain on Marine Drive',
      artistId: artists[0]._id,
      albumId: albums[0]._id,
      genre: 'Indie Pop',
      durationSeconds: 218,
      language: 'Hindi',
      explicit: false,
      streams: 840000
    },
    {
      _id: new ObjectId(),
      title: 'Signal in Raag Yaman',
      artistId: artists[1]._id,
      albumId: albums[1]._id,
      genre: 'Electronic Fusion',
      durationSeconds: 241,
      language: 'Instrumental',
      explicit: false,
      streams: 612000
    },
    {
      _id: new ObjectId(),
      title: '2 AM Study Loop',
      artistId: artists[2]._id,
      albumId: albums[2]._id,
      genre: 'Lo-fi',
      durationSeconds: 184,
      language: 'Instrumental',
      explicit: false,
      streams: 1130000
    },
    {
      _id: new ObjectId(),
      title: 'Paper Lanterns',
      artistId: artists[3]._id,
      albumId: albums[3]._id,
      genre: 'Acoustic',
      durationSeconds: 206,
      language: 'Spanish',
      explicit: false,
      streams: 275000
    },
    {
      _id: new ObjectId(),
      title: 'Bassline Bazaar',
      artistId: artists[1]._id,
      albumId: albums[1]._id,
      genre: 'Electronic Fusion',
      durationSeconds: 196,
      language: 'Instrumental',
      explicit: false,
      streams: 499000
    }
  ];

  const users = [
    {
      _id: new ObjectId(),
      name: 'Ronak Shah',
      email: 'ronak@example.com',
      plan: 'Premium',
      status: 'Active',
      joinedAt: new Date('2025-08-04')
    },
    {
      _id: new ObjectId(),
      name: 'Maya Singh',
      email: 'maya@example.com',
      plan: 'Student',
      status: 'Active',
      joinedAt: new Date('2026-01-12')
    },
    {
      _id: new ObjectId(),
      name: 'Aarav Mehta',
      email: 'aarav@example.com',
      plan: 'Free',
      status: 'Trial',
      joinedAt: new Date('2026-03-18')
    }
  ];

  const playlists = [
    {
      _id: new ObjectId(),
      name: 'Focus Flow',
      description: 'Calm tracks for studying and coding.',
      ownerId: users[0]._id,
      visibility: 'Public',
      songIds: [songs[2]._id, songs[1]._id, songs[3]._id]
    },
    {
      _id: new ObjectId(),
      name: 'Mumbai Nights',
      description: 'Late-night city pop and fusion.',
      ownerId: users[1]._id,
      visibility: 'Private',
      songIds: [songs[0]._id, songs[4]._id]
    }
  ];

  const listens = [
    { userId: users[0]._id, songId: songs[2]._id, listenedAt: new Date('2026-04-21T18:30:00Z') },
    { userId: users[0]._id, songId: songs[2]._id, listenedAt: new Date('2026-04-22T18:30:00Z') },
    { userId: users[1]._id, songId: songs[0]._id, listenedAt: new Date('2026-04-23T13:15:00Z') },
    { userId: users[1]._id, songId: songs[4]._id, listenedAt: new Date('2026-04-23T13:22:00Z') },
    { userId: users[2]._id, songId: songs[1]._id, listenedAt: new Date('2026-04-24T05:45:00Z') },
    { userId: users[2]._id, songId: songs[2]._id, listenedAt: new Date('2026-04-25T06:10:00Z') }
  ];

  await Promise.all([
    db.collection('artists').deleteMany({}),
    db.collection('albums').deleteMany({}),
    db.collection('songs').deleteMany({}),
    db.collection('users').deleteMany({}),
    db.collection('playlists').deleteMany({}),
    db.collection('listens').deleteMany({})
  ]);

  await db.collection('artists').insertMany(artists);
  await db.collection('albums').insertMany(albums);
  await db.collection('songs').insertMany(songs);
  await db.collection('users').insertMany(users);
  await db.collection('playlists').insertMany(playlists);
  await db.collection('listens').insertMany(listens);

  return {
    artists: artists.length,
    albums: albums.length,
    songs: songs.length,
    users: users.length,
    playlists: playlists.length,
    listens: listens.length
  };
}

async function run() {
  const db = await connectToDatabase();
  const counts = await seedDatabase(db);
  console.log('Seeded Music App Management database:', counts);
}

if (require.main === module) {
  run()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(closeDatabase);
}

module.exports = { seedDatabase };
