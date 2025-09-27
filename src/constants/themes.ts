export const THEMES: Record<string, { title: string; desc: string }> = {
  env: { title: 'Environment', desc: 'Climate, ecology, energy' },
  tools: { title: 'Tools', desc: 'Hardware, software, craft' },
  shelter: { title: 'Shelter', desc: 'Housing, architecture' },
  education: { title: 'Education', desc: 'Learning, pedagogy' },
  crypto: { title: 'Cryptography', desc: 'Security, protocols' },
}

export type ThemeKey = keyof typeof THEMES

