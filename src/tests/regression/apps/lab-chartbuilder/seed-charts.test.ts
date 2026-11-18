import { describe, expect, test } from '@jest/globals';
import Database from 'better-sqlite3';
import { ChartsRepository } from '@/apps/lab-chartbuilder/db/repositories/ChartsRepository';
import { SEED_CHART_DEFINITIONS, seedChartsIfMissing } from '@/apps/lab-chartbuilder/db/seed-charts';

describe('chart-builder seed charts', () => {
  test('seedChartsIfMissing inserts all variants once', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE charts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chart_key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        chart_type TEXT NOT NULL,
        options_json TEXT NOT NULL DEFAULT '{}',
        layout_json TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    const repo = new ChartsRepository(db);
    seedChartsIfMissing(repo);
    seedChartsIfMissing(repo);

    const all = repo.findAll({ limit: 20 });
    expect(all.total).toBe(SEED_CHART_DEFINITIONS.length);

    const barStacked = repo.findByKey('chart_seed_bar_stacked');
    expect(barStacked?.options.stacked).toBe(true);
    expect(barStacked?.options.legendPosition).toBe('top');

    const pie = repo.findByKey('chart_seed_pie');
    expect(pie?.options.legendPosition).toBe('right');
    expect(pie?.options.showDataLabels).toBe(true);

    for (const def of SEED_CHART_DEFINITIONS) {
      const row = repo.findByKey(def.chartKey);
      expect(row?.options.showDataLabels).toBe(true);
    }
  });

  test('seedChartsIfMissing enables data labels on charts seeded before showDataLabels default', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE charts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chart_key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        chart_type TEXT NOT NULL,
        options_json TEXT NOT NULL DEFAULT '{}',
        layout_json TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    const repo = new ChartsRepository(db);
    const legacy = SEED_CHART_DEFINITIONS[0];
    repo.create({
      ...legacy,
      options: { ...legacy.options, showDataLabels: false },
    });

    seedChartsIfMissing(repo);

    const updated = repo.findByKey(legacy.chartKey);
    expect(updated?.options.showDataLabels).toBe(true);
  });
});
