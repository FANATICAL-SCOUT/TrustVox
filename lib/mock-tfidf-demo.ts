// Temporary TF-IDF demo utility.
// This file is intentionally standalone and safe to delete later.

export type TfidfDocument = {
  id: string
  text: string
}

export type TfidfScore = {
  term: string
  score: number
}

const DEFAULT_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "was",
  "with",
])

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
}

export function termFrequency(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  if (tokens.length === 0) return counts

  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1)
  }

  for (const [term, count] of counts.entries()) {
    counts.set(term, count / tokens.length)
  }

  return counts
}

export function inverseDocumentFrequency(
  docs: string[][],
  terms: Set<string>,
): Map<string, number> {
  const idf = new Map<string, number>()
  const totalDocs = docs.length

  for (const term of terms) {
    let docCount = 0
    for (const docTokens of docs) {
      if (docTokens.includes(term)) docCount += 1
    }

    // Smooth IDF to avoid divide-by-zero and keep output stable for demos.
    const value = Math.log((1 + totalDocs) / (1 + docCount)) + 1
    idf.set(term, value)
  }

  return idf
}

export function computeTopTfidfTerms(
  documents: TfidfDocument[],
  topN = 5,
  stopWords: Set<string> = DEFAULT_STOP_WORDS,
): Record<string, TfidfScore[]> {
  const tokenized = documents.map((doc) =>
    tokenize(doc.text).filter((token) => !stopWords.has(token)),
  )

  const vocabulary = new Set<string>()
  for (const tokens of tokenized) {
    for (const token of tokens) vocabulary.add(token)
  }

  const idf = inverseDocumentFrequency(tokenized, vocabulary)

  const output: Record<string, TfidfScore[]> = {}

  for (let i = 0; i < documents.length; i += 1) {
    const doc = documents[i]
    const tf = termFrequency(tokenized[i])

    const ranked: TfidfScore[] = [...tf.entries()]
      .map(([term, tfValue]) => ({
        term,
        score: tfValue * (idf.get(term) ?? 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, topN))

    output[doc.id] = ranked
  }

  return output
}

// Quick sample payload for UI experimentation or screenshots.
export const TFIDF_DEMO_DATA: TfidfDocument[] = [
  {
    id: "campaign-1",
    text: "Fast checkout and easy payment flow. Great support team and smooth order tracking.",
  },
  {
    id: "campaign-2",
    text: "Checkout failed twice. Payment retries were slow, but support resolved the issue.",
  },
  {
    id: "campaign-3",
    text: "Love the dashboard analytics and campaign insights. Tracking is clear and fast.",
  },
]

export function runTfidfDemo(topN = 5): Record<string, TfidfScore[]> {
  return computeTopTfidfTerms(TFIDF_DEMO_DATA, topN)
}
