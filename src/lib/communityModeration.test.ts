import { describe, expect, it } from 'vitest';
import { communityReportReasons, validateCommunityText } from './communityModeration';

describe('community moderation', () => {
  it('allows ordinary creative captions', () => {
    expect(validateCommunityText('5 ideias para melhorar seu conteúdo no Instagram')).toEqual({ allowed: true });
  });

  it('rejects clearly unsafe content before it reaches the database', () => {
    const result = validateCommunityText('conteúdo com pornografia explícita');
    expect(result.allowed).toBe(false);
  });

  it('provides the complete set of report reasons used by the database policy', () => {
    expect(communityReportReasons.map((reason) => reason.value)).toEqual([
      'spam',
      'harassment',
      'hate',
      'sexual',
      'violence',
      'illegal',
      'other',
    ]);
  });
});
