import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema/schemas';
import * as relations from './schema/relations';
import { seed } from './seed';
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import migrations from '../../drizzle/migrations.js';

const expoDb = SQLite.openDatabaseSync('w2s.db');

export const db = drizzle(expoDb, {
    schema: {
        ...schema,
        ...relations,
    }
});
