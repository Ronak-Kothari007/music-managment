require('dotenv').config();

const { connectToDatabase, closeDatabase, ObjectId } = require('./db');

const artistTemplates = [
  { name: 'Asha Rivers', country: 'India', genre: 'Indie Pop', monthlyListeners: 1842000 },
  { name: 'Neon Tabla', country: 'India', genre: 'Electronic Fusion', monthlyListeners: 924000 },
  { name: 'The Midnight Raag', country: 'United States', genre: 'Lo-fi', monthlyListeners: 618000 },
  { name: 'Sofia Vale', country: 'Spain', genre: 'Acoustic', monthlyListeners: 402000 },
  { name: 'Luna Horizon', country: 'United Kingdom', genre: 'Dream Pop', monthlyListeners: 720000 },
  { name: 'Nova Dhawan', country: 'Canada', genre: 'Electronica', monthlyListeners: 310000 },
  { name: 'Jai Beats', country: 'India', genre: 'Bollywood Funk', monthlyListeners: 540000 },
  { name: 'Cairo Nights', country: 'Egypt', genre: 'World Fusion', monthlyListeners: 270000 },
  { name: 'Velvet Echo', country: 'Australia', genre: 'Chillwave', monthlyListeners: 190000 },
  { name: 'Sanjay & The Strings', country: 'India', genre: 'Acoustic Pop', monthlyListeners: 125000 }
];

const albumTitles = [
  'City Monsoon', 'Circuit Sitar', 'After Hours Raga', 'Strings at Dawn',
  'Moonlit Bazaar', 'Synthetic Sunrise', 'Oceanic Daydream', 'Midnight Calligraphy',
  'Paper Lanterns', 'Starline Sessions', 'Electric Chai', 'Temple Groove',
  'Desert Dusk', 'Mumbai Daydream', 'Neon Highway', 'Lotus Rhythm',
  'Platinum Peacock', 'Neon Oasis', 'Raga Satellite', 'Whispering Sitar'
];

const songTitlePrefixes = [
  'Rain on', 'Signal in', '2 AM', 'Paper', 'Bassline', 'Saffron', 'Velvet', 'Wandering',
  'Midnight', 'Golden', 'Crimson', 'Electric', 'Dancing', 'Twilight', 'Sonic', 'Lotus',
  'Canvas', 'Aurora', 'Hidden', 'Endless'
];

const songTitleSuffixes = [
  'Marine Drive', 'Raag Yaman', 'Study Loop', 'Lanterns', 'Bazaar', 'Sky', 'Dreams', 'Route',
  'Moon', 'Pulse', 'Temple', 'Oasis', 'Skyline', 'Sea', 'Fire', 'Rhythm', 'Waves', 'Mirage', 'Aura', 'Lights'
];

const userTemplates = [
  { name: 'Maya Singh', plan: 'Student' },
  { name: 'Aarav Mehta', plan: 'Free' },
  { name: 'Priya Shah', plan: 'Premium' },
  { name: 'Kavya Rao', plan: 'Premium' },
  { name: 'Dev Patel', plan: 'Free' },
  { name: 'Sara Kapoor', plan: 'Premium' },
  { name: 'Ishaan Joshi', plan: 'Student' },
  { name: 'Tanvi Sharma', plan: 'Free' },
  { name: 'Rhea Nair', plan: 'Premium' },
  { name: 'Aditya Verma', plan: 'Student' },
  { name: 'Nina Bose', plan: 'Free' },
  { name: 'Kabir Singh', plan: 'Premium' },
  { name: 'Meera Gupta', plan: 'Student' },
  { name: 'Ananya Chawla', plan: 'Premium' },
  { name: 'Kabir Das', plan: 'Free' },
  { name: 'Lina Desai', plan: 'Premium' },
  { name: 'Rohan Mehra', plan: 'Student' },
  { name: 'Zara Khan', plan: 'Premium' },
  { name: 'Isha Patel', plan: 'Free' },
  { name: 'Arjun Nair', plan: 'Premium' }
];

function makeId() {
  return new ObjectId();
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function createArtists() {
  return artistTemplates.map((template) => ({
    _id: makeId(),
    name: template.name,
    country: template.country,
    genre: template.genre,
    monthlyListeners: template.monthlyListeners
  }));
}

function createAlbums(artists) {
  return artists.flatMap((artist, index) => {
    const baseYear = 2022 + (index % 4);
    return [
      {
        _id: makeId(),
        title: albumTitles[(index * 2) % albumTitles.length],
        artistId: artist._id,
        releaseYear: baseYear,
        label: `Label ${index + 1}`
      },
      {
        _id: makeId(),
        title: albumTitles[(index * 2 + 1) % albumTitles.length],
        artistId: artist._id,
        releaseYear: baseYear + 1,
        label: `Label ${index + 1}`
      }
    ];
  });
}

function createSongs(artists, albums) {
  return albums.flatMap((album, index) => {
    const artist = artists.find((item) => item._id.equals(album.artistId));
    const songCount = 3;
    return Array.from({ length: songCount }, (_, songIndex) => {
      const title = `${randomItem(songTitlePrefixes)} ${randomItem(songTitleSuffixes)}`;
      return {
        _id: makeId(),
        title,
        artistId: artist._id,
        albumId: album._id,
        genre: artist.genre,
        durationSeconds: 180 + ((index + songIndex) % 90),
        language: artist.country === 'India' ? 'Hindi' : 'English',
        explicit: (index + songIndex) % 7 === 0,
        streams: 50000 + ((index + songIndex) * 12000)
      };
    });
  });
}

function createUsers() {
  return userTemplates.map((template, index) => ({
    _id: makeId(),
    name: template.name,
    email: `${template.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    plan: template.plan,
    status: index % 5 === 0 ? 'Trial' : 'Active',
    joinedAt: new Date(2025, index % 12, 1 + (index % 28))
  }));
}

function createPlaylists(users, songs) {
  return users.slice(0, 12).map((user, index) => {
    const playlistSongs = songs
      .slice(index * 3, index * 3 + 6)
      .map((song) => song._id);

    return {
      _id: makeId(),
      name: `Playlist ${index + 1}`,
      description: `Sample playlist ${index + 1} for ${user.name}`,
      ownerId: user._id,
      visibility: index % 3 === 0 ? 'Public' : 'Private',
      songIds: playlistSongs.length ? playlistSongs : [songs[0]._id]
    };
  });
}

function createListens(users, songs) {
  const listens = [];
  for (let i = 0; i < 120; i += 1) {
    const user = users[i % users.length];
    const song = songs[i % songs.length];
    listens.push({
      userId: user._id,
      songId: song._id,
      listenedAt: new Date(2026, i % 12, 1 + (i % 28), 8 + (i % 12), (i * 5) % 60)
    });
  }
  return listens;
}

async function seedDatabase(db) {
  const artists = createArtists();
  const albums = createAlbums(artists);
  const songs = createSongs(artists, albums);
  const users = createUsers();
  const playlists = createPlaylists(users, songs);
  const listens = createListens(users, songs);

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
