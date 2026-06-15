import { reorderDeeds } from '@/state/deedStore';
import { db } from '@/db/client';
import { scheduleSync } from '@/state/sync';

// Capture the (sortOrder) value paired with the (id) filter for each update issued
// inside the transaction, so we can assert the resulting order without a real DB.
const updates: { id: string; set: Record<string, unknown> }[] = [];

jest.mock('@/state/sync', () => ({ scheduleSync: jest.fn() }));

// auth pulls in the supabase client (requires env vars); stub it out.
jest.mock('@/state/auth', () => ({ user$: { get: () => null } }));

// expo-crypto reaches for expo winter globals that aren't available mid-test.
jest.mock('expo-crypto', () => ({ randomUUID: () => 'test-uuid' }));

// useLiveQuery would load the native expo-sqlite binding; not needed here.
jest.mock('drizzle-orm/expo-sqlite', () => ({ useLiveQuery: jest.fn() }));

jest.mock('@/db/client', () => {
  const makeUpdateChain = () => {
    const pending: { set?: Record<string, unknown> } = {};
    const chain = {
      set: (values: Record<string, unknown>) => {
        pending.set = values;
        return chain;
      },
      where: (filter: { id: string }) => {
        updates.push({ id: filter.id, set: pending.set ?? {} });
        return Promise.resolve();
      },
    };
    return chain;
  };
  return {
    db: {
      transaction: async (cb: (tx: unknown) => Promise<void>) => {
        await cb({ update: () => makeUpdateChain() });
      },
    },
  };
});

// drizzle's eq() is used to build the filter; return a plain { id } object so the
// mocked .where() above can read it back.
jest.mock('drizzle-orm', () => ({
  eq: (_col: unknown, value: string) => ({ id: value }),
  and: jest.fn(),
  inArray: jest.fn(),
  lte: jest.fn(),
  or: jest.fn(),
  isNull: jest.fn(),
  gt: jest.fn(),
  sql: jest.fn(),
  asc: jest.fn(),
}));

beforeEach(() => {
  updates.length = 0;
  jest.clearAllMocks();
});

describe('reorderDeeds', () => {
  it('rewrites sortOrder to match the given id order and marks rows dirty', async () => {
    await reorderDeeds(['c', 'a', 'b']);

    expect(updates).toEqual([
      { id: 'c', set: expect.objectContaining({ sortOrder: 0, dirty: true }) },
      { id: 'a', set: expect.objectContaining({ sortOrder: 1, dirty: true }) },
      { id: 'b', set: expect.objectContaining({ sortOrder: 2, dirty: true }) },
    ]);
  });

  it('schedules a sync after persisting the new order', async () => {
    await reorderDeeds(['a', 'b']);
    expect(scheduleSync).toHaveBeenCalledTimes(1);
  });

  it('is a no-op for fewer than two ids', async () => {
    await reorderDeeds(['only-one']);
    expect(updates).toHaveLength(0);
    expect(scheduleSync).not.toHaveBeenCalled();
  });
});
