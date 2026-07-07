import { promises as fs } from 'fs'
import path from 'path'
import { getOutlineDocsFromCacheOrRefresh } from './outline-docs-cache'
import { buildDocTreeFromOutlineDocuments, mapOutlineDocumentToDocPage, type DocTreeNode } from './service'

export interface NavigationCachePayload {
  lang: 'vi' | 'en'
  generatedAt: string
  navigation: DocTreeNode[]
}

function getCacheDir(): string {
  return process.env.NAVIGATION_CACHE_DIR || path.join(process.cwd(), 'data', 'cache')
}

function getCacheFile(lang: 'vi' | 'en'): string {
  return path.join(getCacheDir(), `docs-navigation-${lang}.json`)
}

export async function readNavigationCache(lang: 'vi' | 'en'): Promise<NavigationCachePayload | null> {
  try {
    const raw = await fs.readFile(getCacheFile(lang), 'utf8')
    const payload = JSON.parse(raw) as NavigationCachePayload

    if (!payload || payload.lang !== lang || !Array.isArray(payload.navigation)) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

export async function writeNavigationCache(
  lang: 'vi' | 'en',
  navigation: DocTreeNode[]
): Promise<NavigationCachePayload> {
  const payload: NavigationCachePayload = {
    lang,
    generatedAt: new Date().toISOString(),
    navigation,
  }

  const cacheDir = getCacheDir()
  const cacheFile = getCacheFile(lang)
  const tmpFile = `${cacheFile}.${process.pid}.tmp`

  await fs.mkdir(cacheDir, { recursive: true })
  await fs.writeFile(tmpFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  await fs.rename(tmpFile, cacheFile)

  return payload
}

export async function refreshNavigationCache(lang: 'vi' | 'en'): Promise<NavigationCachePayload> {
  const docsPayload = await getOutlineDocsFromCacheOrRefresh(lang)
  const pages = docsPayload.documents.map(doc => mapOutlineDocumentToDocPage(doc, lang))
  const navigation = buildDocTreeFromOutlineDocuments(pages)
  return writeNavigationCache(lang, navigation)
}

export async function getNavigationFromCacheOrRefresh(lang: 'vi' | 'en'): Promise<NavigationCachePayload> {
  const cached = await readNavigationCache(lang)
  if (cached) return cached

  return refreshNavigationCache(lang)
}
