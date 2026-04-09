import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as gemini from '@/lib/services/gemini'

// Reset mocks
beforeEach(() => {
  vi.clearAllMocks()
})

describe('Gemini Services - Exported Functions', () => {
  it('generateRecruiterEmail returns valid fallback structure', async () => {
    const result = await gemini.generateRecruiterEmail({
      recruiterName: 'John Doe',
      company: 'TechCorp',
      resumeText: 'Test resume.',
      persona: 'STARTUP'
    } as Parameters<typeof gemini.generateRecruiterEmail>[0])

    expect(result).toBeDefined()
    expect(result).toHaveProperty('subject')
    expect(result).toHaveProperty('body')
    expect(result.body).toContain('Dear John Doe')
  })

  it('analyzeRecruiterReply returns expected shape', async () => {
    const result = await gemini.analyzeRecruiterReply({ content: 'Interview scheduled' })

    expect(result).toHaveProperty('sentiment')
    expect(result.intent).toBeTruthy()
    expect(result.summary.length).toBeGreaterThan(0)
  })
})

describe('Gemini Internal Functions via Namespace', () => {
  const g = gemini as typeof gemini & {
    parseJsonResponse: <T>(text: string) => T | null
    sanitizeStringList: (value: unknown, fallback: string[], limit?: number) => string[]
    clampPercentage: (value: number) => number
  }

  it('parseJsonResponse returns null for invalid JSON', () => {
    expect(g.parseJsonResponse('invalid')).toBeNull()
  })

  it('sanitizeStringList handles null', () => {
    expect(g.sanitizeStringList(null, ['fall'])).toEqual(['fall'])
  })

  it('sanitizeStringList filters array', () => {
    expect(g.sanitizeStringList(['a', null, ''], ['fall'], 2)).toEqual(['a'])
  })

  it('clampPercentage clamps values', () => {
    expect(g.clampPercentage(NaN)).toBe(0)
    expect(g.clampPercentage(-5)).toBe(0)
    expect(g.clampPercentage(110)).toBe(100)
  })
})
