import { MongoMemoryServer } from 'mongodb-memory-server';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', '.local-mongo-data');
mkdirSync(dbPath, { recursive: true });

const mongod = await MongoMemoryServer.create({
  instance: {
    port: 27017,
    dbPath,
    storageEngine: 'wiredTiger',
  },
});

console.log(`\nLocal MongoDB running at: ${mongod.getUri()}stockdb`);
console.log('Data persists in .local-mongo-data between restarts.');
console.log('Leave this running, then in another terminal: npm run dev\n');

const shutdown = async () => {
  console.log('\nStopping local MongoDB...');
  await mongod.stop();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
