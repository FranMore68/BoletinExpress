export const extractionLimits = {
  document: { audioCount: 5, audioSeconds: 60, photoCount: 5, extractions: 10 },
  account: { activeDrafts: 3, dailyAudioSeconds: 300, dailyExtractions: 10 },
} as const;
