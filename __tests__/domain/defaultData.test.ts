import { buildDefaultUserData } from '@/db/defaultData';

const NOW = 1_700_000_000_000;
const TODAY = '2026-06-15';

describe('buildDefaultUserData', () => {
  it('uses deterministic ids and intact references by default', () => {
    const { sections, dhikrs, deeds } = buildDefaultUserData({ now: NOW, today: TODAY });

    expect(sections.find((s) => s.id === 'sec_morning')).toBeDefined();
    expect(dhikrs.find((d) => d.id === 'dhikr_istighfar')).toBeDefined();

    const fajr = deeds.find((d) => d.id === 'deed_fajr');
    expect(fajr?.sectionId).toBe('sec_morning');

    const istighfar = deeds.find((d) => d.id === 'deed_istighfar_100');
    expect(istighfar?.linkedDhikrId).toBe('dhikr_istighfar');
  });

  it('stamps every row with the given timestamp and seed flags', () => {
    const { sections, dhikrs, deeds } = buildDefaultUserData({ now: NOW, today: TODAY });
    for (const row of [...sections, ...dhikrs, ...deeds]) {
      expect(row.updatedAt).toBe(NOW);
      expect(row.deleted).toBe(false);
      expect(row.dirty).toBe(true);
    }
    expect(deeds.every((d) => d.createdAt === TODAY)).toBe(true);
  });

  it('generates fresh unique ids for deeds/dhikrs and remaps references when freshIds is true', () => {
    let counter = 0;
    const genId = () => `gen_${counter++}`;
    const { sections, dhikrs, deeds } = buildDefaultUserData({ now: NOW, today: TODAY, freshIds: true, genId });

    // Deeds and dhikrs get fresh keys to avoid colliding with tombstoned rows.
    const freshIds = [...dhikrs, ...deeds].map((r) => r.id);
    expect(freshIds.every((id) => id.startsWith('gen_'))).toBe(true);
    expect(new Set(freshIds).size).toBe(freshIds.length);

    // References point at the correct ids.
    const sectionIds = new Set(sections.map((s) => s.id));
    const dhikrIds = new Set(dhikrs.map((d) => d.id));
    for (const deed of deeds) {
      expect(sectionIds.has(deed.sectionId)).toBe(true);
      if (deed.linkedDhikrId) {
        expect(dhikrIds.has(deed.linkedDhikrId)).toBe(true);
      }
    }

    // The specific istighfar link resolves to the freshly-generated dhikr id.
    const morning = sections.find((s) => s.name === 'الصبح')!;
    const fajr = deeds.find((d) => d.name === 'صلاة الفجر')!;
    expect(fajr.sectionId).toBe(morning.id);

    const istighfarDhikr = dhikrs.find((d) => d.name === 'استغفار')!;
    const istighfarDeed = deeds.find((d) => d.name === 'الاستغفار')!;
    expect(istighfarDeed.linkedDhikrId).toBe(istighfarDhikr.id);
  });

  it('keeps stable section ids even when freshIds is true', () => {
    // The global deedDefinitions catalog references sections by their stable
    // keys (defaultSectionId = 'sec_morning', …). If a factory reset randomised
    // section ids, those references would dangle and library "add" would insert
    // deeds into non-existent sections (invisible on the scorecard). So sections
    // must keep their deterministic ids regardless of freshIds.
    let counter = 0;
    const genId = () => `gen_${counter++}`;
    const { sections } = buildDefaultUserData({ now: NOW, today: TODAY, freshIds: true, genId });

    expect(sections.find((s) => s.id === 'sec_morning')).toBeDefined();
    expect(sections.find((s) => s.id === 'sec_quran')).toBeDefined();
    expect(sections.every((s) => !s.id.startsWith('gen_'))).toBe(true);
  });

  it('throws if freshIds is true without a genId', () => {
    expect(() => buildDefaultUserData({ now: NOW, today: TODAY, freshIds: true })).toThrow(/genId/);
  });
});
