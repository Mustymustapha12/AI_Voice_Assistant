export function createTestCorrelationId(sequence = 1): string {
  return `00000000-0000-4000-8000-${sequence.toString().padStart(12, '0')}`;
}
