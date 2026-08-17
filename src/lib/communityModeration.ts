export const communityReportReasons = [
  { value: 'spam', label: 'Spam ou conteúdo enganoso' },
  { value: 'harassment', label: 'Assédio ou intimidação' },
  { value: 'hate', label: 'Discurso de ódio' },
  { value: 'sexual', label: 'Conteúdo sexual impróprio' },
  { value: 'violence', label: 'Violência ou ameaça' },
  { value: 'illegal', label: 'Atividade ilegal' },
  { value: 'other', label: 'Outro motivo' },
] as const;

export type CommunityReportReason = typeof communityReportReasons[number]['value'];

const unsafeCommunityPattern = /(pornografia|pornographic|pedofilia|child[ -]?porn|estupro|rape\b|ameaça de morte|death threat|nazismo|terrorismo)/i;

export function validateCommunityText(value: string) {
  const normalized = value.trim();
  if (!normalized) return { allowed: true as const };
  if (unsafeCommunityPattern.test(normalized)) {
    return {
      allowed: false as const,
      message: 'Este conteúdo não pode ser publicado na comunidade.',
    };
  }
  return { allowed: true as const };
}
