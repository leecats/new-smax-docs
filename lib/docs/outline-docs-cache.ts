import { promises as fs } from 'fs'
import path from 'path'
import { getOutlineDocument, getOutlineDocuments, type OutlineDocument } from '@/lib/outline'

export interface OutlineDocsCachePayload {
  lang: 'vi' | 'en'
  generatedAt: string
  documents: OutlineDocument[]
}

function getCollectionId(lang: 'vi' | 'en'): string {
  const id = lang === 'vi'
    ? process.env.OUTLINE_COLLECTION_VI_ID
    : process.env.OUTLINE_COLLECTION_EN_ID

  return (id || '').trim()
}

function getCacheDir(): string {
  return process.env.NAVIGATION_CACHE_DIR || path.join(process.cwd(), 'data', 'cache')
}

function getCacheFile(lang: 'vi' | 'en'): string {
  return path.join(getCacheDir(), `docs-${lang}.json`)
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++
      results[index] = await mapper(items[index], index)
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length || 1))
  await Promise.all(Array.from({ length: workerCount }, worker))

  return results
}

export async function readOutlineDocsCache(lang: 'vi' | 'en'): Promise<OutlineDocsCachePayload | null> {
  try {
    const raw = await fs.readFile(getCacheFile(lang), 'utf8')
    const payload = JSON.parse(raw) as OutlineDocsCachePayload

    if (!payload || payload.lang !== lang || !Array.isArray(payload.documents)) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

export async function writeOutlineDocsCache(
  lang: 'vi' | 'en',
  documents: OutlineDocument[]
): Promise<OutlineDocsCachePayload> {
  const payload: OutlineDocsCachePayload = {
    lang,
    generatedAt: new Date().toISOString(),
    documents,
  }

  const cacheDir = getCacheDir()
  const cacheFile = getCacheFile(lang)
  const tmpFile = `${cacheFile}.${process.pid}.tmp`

  await fs.mkdir(cacheDir, { recursive: true })
  await fs.writeFile(tmpFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  await fs.rename(tmpFile, cacheFile)

  return payload
}

export async function refreshOutlineDocsCache(lang: 'vi' | 'en'): Promise<OutlineDocsCachePayload> {
  const collectionId = getCollectionId(lang)
  const listDocs = await getOutlineDocuments(collectionId, { cache: 'no-store' })
  const concurrency = Number(process.env.DOCS_CACHE_CONCURRENCY || 5)

  const documents = await mapWithConcurrency(
    listDocs,
    Number.isFinite(concurrency) ? concurrency : 5,
    async (doc) => {
      try {
        const fullDoc = await getOutlineDocument(doc.id, { cache: 'no-store' })
        return fullDoc || doc
      } catch (error) {
        console.error(`[Docs Cache] Failed to fetch full doc ${doc.id}:`, error)
        return doc
      }
    }
  )

  return writeOutlineDocsCache(lang, documents)
}

export async function getOutlineDocsFromCacheOrRefresh(lang: 'vi' | 'en'): Promise<OutlineDocsCachePayload> {
  const cached = await readOutlineDocsCache(lang)
  if (cached) return cached

  return refreshOutlineDocsCache(lang)
}
