# Music App Management System

A complete DBMS prototype for managing a music streaming application. It uses MongoDB for storage, Node.js and Express for the backend API, and a plain HTML/CSS/JavaScript frontend served by the backend.

## Modules

- Artists: artist profile, country, genre, monthly listeners
- Albums: release metadata linked to artists
- Songs: catalog records linked to artists and albums
- Users: subscriber records and plan status
- Playlists: owner, visibility, description, and many-song membership
- Listens: play history used for reporting and stream increments

## MongoDB Collections

| Collection | Purpose | Important Fields |
| --- | --- | --- |
| `artists` | Stores artist metadata | `name`, `country`, `genre`, `monthlyListeners` |
| `albums` | Stores albums/releases | `title`, `artistId`, `releaseYear`, `label` |
| `songs` | Stores song catalog | `title`, `artistId`, `albumId`, `genre`, `durationSeconds`, `streams` |
| `users` | Stores app users | `name`, `email`, `plan`, `status`, `joinedAt` |
| `playlists` | Stores curated lists | `name`, `ownerId`, `visibility`, `songIds` |
| `listens` | Stores play events | `userId`, `songId`, `listenedAt` |

## Relationships

- One artist can have many albums.
- One artist can have many songs.
- One album can have many songs.
- One user can own many playlists.
- One playlist can contain many songs.
- One user can create many listen events.
- One song can have many listen events.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file from `.env.example`:

   ```bash
   copy .env.example .env
   ```

3. Start MongoDB locally. The default connection string is:

   ```text
   mongodb://127.0.0.1:27017
   ```

   If you use Docker, you can start MongoDB with:

   ```bash
   docker compose up -d
   ```

4. Seed sample records:

   ```bash
   npm run seed
   ```

5. Start the prototype:

   ```bash
   npm start
   ```

6. Open the app:

   ```text
   http://localhost:4000
   ```

## Connect to MongoDB Atlas

1. Go to MongoDB Atlas and create a free cluster.
2. In Atlas, create a database user from **Database Access**. Save the username and password.
3. In **Network Access**, add the IP address that will connect to Atlas.
   - For local development, use **Add Current IP Address**.
   - For simple student deployment, `0.0.0.0/0` works, but it allows connections from anywhere. Use a strong password and avoid this for production-grade apps.
4. Open your cluster, click **Connect**, choose **Drivers**, select **Node.js**, and copy the `mongodb+srv://...` connection string.
5. Replace the username and password placeholders in the connection string.
6. Put it in `.env`:

   ```env
   PORT=4000
   MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/?retryWrites=true&w=majority
   MONGODB_DB=music_app_management
   ```

7. Seed Atlas:

   ```bash
   npm run seed
   ```

8. Start the app:

   ```bash
   npm start
   ```

## Deploy on Render

This project serves both the backend API and frontend from one Express app, so one Render Web Service is enough.

1. Push this folder to a GitHub repository.
2. Go to Render and create **New > Web Service**.
3. Connect your GitHub repository.
4. Use these settings:

   | Setting | Value |
   | --- | --- |
   | Runtime | Node |
   | Build Command | `npm install` |
   | Start Command | `npm start` |

5. Add environment variables in Render:

   | Key | Value |
   | --- | --- |
   | `MONGODB_URI` | Your Atlas `mongodb+srv://...` connection string |
   | `MONGODB_DB` | `music_app_management` |

6. Deploy the service.
7. After deployment, open the Render URL. The frontend will load from the same deployed backend.
8. To seed the deployed database, either run `npm run seed` locally with the Atlas `.env`, or click **Seed sample data** inside the deployed app.

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Checks backend and database connectivity |
| `POST` | `/api/seed` | Recreates sample data |
| `GET` | `/api/summary` | Dashboard counts and top songs |
| `GET` | `/api/reports/top-songs` | Aggregated play report |
| `POST` | `/api/listens` | Records a play event and increments stream count |
| `GET/POST` | `/api/artists` | List or create artists |
| `PUT/DELETE` | `/api/artists/:id` | Update or delete an artist |
| `GET/POST` | `/api/albums` | List or create albums |
| `PUT/DELETE` | `/api/albums/:id` | Update or delete an album |
| `GET/POST` | `/api/songs` | List or create songs |
| `PUT/DELETE` | `/api/songs/:id` | Update or delete a song |
| `GET/POST` | `/api/users` | List or create users |
| `PUT/DELETE` | `/api/users/:id` | Update or delete a user |
| `GET/POST` | `/api/playlists` | List or create playlists |
| `PUT/DELETE` | `/api/playlists/:id` | Update or delete a playlist |

## DBMS Concepts Covered

- Collections and documents
- Primary keys through MongoDB `_id`
- Reference-style relationships with `ObjectId`
- CRUD operations
- Indexing and uniqueness constraints
- Aggregation pipeline reports
- Data validation in the backend layer
- Referential checks before delete operations

## Suggested Viva / Presentation Points

- The project uses normalized references with `ObjectId` instead of embedding every related record.
- Indexes improve lookup speed and enforce uniqueness for artist names, user emails, and playlist names.
- Aggregation is used to calculate the top songs report from play history.
- Delete operations protect important relationships, such as albums and songs connected to artists.
