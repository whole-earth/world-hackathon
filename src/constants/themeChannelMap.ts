export const THEME_TO_CHANNEL: Record<string, string> = {
  env: 'environment',
  tools: 'tools',
  shelter: 'shelter',
  education: 'education',
  crypto: 'cryptography',
}

export function mapThemeToChannel(themeSlug: string): string {
  return THEME_TO_CHANNEL[themeSlug] || themeSlug
}

export const CHANNEL_TO_THEME: Record<string, string> = {
  environment: 'env',
  tools: 'tools',
  shelter: 'shelter',
  education: 'education',
  cryptography: 'crypto',
}

export function legacyThemeSlugForChannel(channelSlug: string): string | null {
  return CHANNEL_TO_THEME[channelSlug] || null
}
