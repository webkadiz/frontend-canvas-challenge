import { expect, it } from 'vitest';
import { generationPhase, generationRunning } from '../src/model/generation-state';

const base = { ready: true, starting: false, pending: false, error: false };

it.each(['processing', 'failed', 'succeeded'] as const)(
  'represents server generation state %s',
  (status) => {
    expect(generationPhase({ ...base, job: { status } })).toBe(status);
  },
);

it('gives unacknowledged requests priority over old generation state', () => {
  expect(
    generationPhase({ ...base, pending: true, ready: false, job: { status: 'processing' } }),
  ).toBe('uncertain');
  expect(generationRunning('uncertain')).toBe(false);
});

it('distinguishes a polling error from a failed generation', () => {
  expect(generationPhase({ ...base, error: true, job: { status: 'processing' } })).toBe(
    'poll_error',
  );
  expect(generationRunning('poll_error')).toBe(true);
});

it('covers idle and local-start states', () => {
  expect(generationPhase(base)).toBe('ready');
  expect(generationPhase({ ...base, ready: false })).toBe('incomplete');
  expect(generationPhase({ ...base, starting: true, pending: true })).toBe('starting');
});
