import { createReadStream, existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { parse } from 'csv-parse';
import mongoose from 'mongoose';
import {
  MedicineDatabaseEntry,
  MedicineDatabaseSchema,
} from '../src/medicine-scanner/schemas/medicine-database.schema';
import { normalizeMedicineName } from '../src/medicine-scanner/utils/medicine-database-normalizer';

const BATCH_SIZE = 1000;
const SUBSTITUTE_COLUMNS = [
  'substitute0',
  'substitute1',
  'substitute2',
  'substitute3',
  'substitute4',
] as const;
const USE_COLUMNS = ['use0', 'use1', 'use2', 'use3', 'use4'] as const;
const COMPOSITION_COLUMNS = ['short_composition1', 'short_composition2'] as const;

type CsvRow = Record<string, string | undefined>;

type ImportStats = {
  rowsFound: number;
  imported: number;
  updated: number;
  skipped: number;
  invalidRows: number;
  duplicatesInDataset: number;
};

function loadEnvFile() {
  const envPath = resolve(__dirname, '../.env');
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function cleanString(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseBoolean(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function parsePrice(value: string | undefined): number | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function splitDelimitedList(value: string | undefined): string[] {
  const trimmed = value?.trim();
  if (!trimmed) {
    return [];
  }

  return trimmed
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function collectValues(row: CsvRow, columns: readonly string[]): string[] {
  const values: string[] = [];

  for (const column of columns) {
    const value = cleanString(row[column]);
    if (value) {
      values.push(value);
    }
  }

  return values;
}

function mapRowToDocument(row: CsvRow) {
  const name = cleanString(row.name);
  if (!name) {
    return null;
  }

  const externalId = cleanString(row.id);
  if (!externalId) {
    return null;
  }

  const compositions = collectValues(row, COMPOSITION_COLUMNS).map((raw) => ({
    raw,
  }));

  return {
    externalId,
    name,
    normalizedName: normalizeMedicineName(name),
    price: parsePrice(row['price(₹)']),
    isDiscontinued: parseBoolean(row.Is_discontinued),
    manufacturerName: cleanString(row.manufacturer_name),
    type: cleanString(row.type),
    packSizeLabel: cleanString(row.pack_size_label),
    compositions,
    substitutes: collectValues(row, SUBSTITUTE_COLUMNS),
    sideEffects: splitDelimitedList(row.Consolidated_Side_Effects),
    uses: collectValues(row, USE_COLUMNS),
    chemicalClass: cleanString(row['Chemical Class']),
    habitForming: cleanString(row['Habit Forming']),
    therapeuticClass: cleanString(row['Therapeutic Class']),
    actionClass: cleanString(row['Action Class']),
    source: 'indian-medicine-dataset',
  };
}

async function flushBatch(
  model: mongoose.Model<MedicineDatabaseEntry>,
  batch: Array<NonNullable<ReturnType<typeof mapRowToDocument>>>,
  stats: ImportStats,
) {
  if (batch.length === 0) {
    return;
  }

  const result = await model.bulkWrite(
    batch.map((document) => ({
      updateOne: {
        filter: { externalId: document.externalId },
        update: { $set: document },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  stats.imported += result.upsertedCount;
  stats.updated += result.modifiedCount;
}

async function importIndianMedicines() {
  loadEnvFile();

  const datasetPath = process.env.INDIA_MEDICINE_DATASET_PATH;
  if (!datasetPath) {
    throw new Error(
      'INDIA_MEDICINE_DATASET_PATH is required. Example: INDIA_MEDICINE_DATASET_PATH=/path/to/Extensive_A_Z_medicines_dataset_of_India.csv',
    );
  }

  const resolvedDatasetPath = resolve(datasetPath);
  if (!existsSync(resolvedDatasetPath)) {
    throw new Error(`Dataset file not found: ${resolvedDatasetPath}`);
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required to import Indian medicine data.');
  }

  await mongoose.connect(mongoUri);

  const model = mongoose.model<MedicineDatabaseEntry>(
    MedicineDatabaseEntry.name,
    MedicineDatabaseSchema,
    'medicine_database',
  );

  await model.syncIndexes();

  const stats: ImportStats = {
    rowsFound: 0,
    imported: 0,
    updated: 0,
    skipped: 0,
    invalidRows: 0,
    duplicatesInDataset: 0,
  };

  const seenExternalIds = new Set<string>();
  let batch: Array<NonNullable<ReturnType<typeof mapRowToDocument>>> = [];

  const parser = createReadStream(resolvedDatasetPath).pipe(
    parse({
      columns: true,
      bom: true,
      relax_column_count: true,
      skip_records_with_error: true,
      trim: true,
    }),
  );

  for await (const row of parser) {
    stats.rowsFound += 1;

    const document = mapRowToDocument(row as CsvRow);
    if (!document) {
      stats.invalidRows += 1;
      stats.skipped += 1;
      continue;
    }

    if (seenExternalIds.has(document.externalId)) {
      stats.duplicatesInDataset += 1;
      stats.skipped += 1;
      continue;
    }

    seenExternalIds.add(document.externalId);
    batch.push(document);

    if (batch.length >= BATCH_SIZE) {
      await flushBatch(model, batch, stats);
      batch = [];
    }
  }

  await flushBatch(model, batch, stats);

  const totalInCollection = await model.countDocuments();

  console.log('Indian medicine import completed.');
  console.log(
    JSON.stringify(
      {
        ...stats,
        collection: 'medicine_database',
        totalInCollection,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
}

importIndianMedicines().catch(async (error) => {
  console.error('Indian medicine import failed:', error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
