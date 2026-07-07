import { refreshOutlineDocsCache } from './outline-docs-cache'
import { writeNavigationCache, type NavigationCachePayload } from './navigation-cache'
import { buildDocTreeFromOutlineDocuments, mapOutlineDocumentToDocPage } from './service'

export interface DocsCacheSyncResult {
  lang: 'vi' | 'en'
  generatedAt: string
  documents: number
  navigationRoots: number
}

export interface DocsCacheSyncAllResult {
  vi: DocsCacheSyncResult
  en: DocsCacheSyncResult
}

export async function refreshDocsAndNavigationCache(lang: 'vi' | 'en'): Promise<DocsCacheSyncResult> {
  const docsPayload = await refreshOutlineDocsCache(lang)
  const pages = docsPayload.documents.map(doc => mapOutlineDocumentToDocPage(doc, lang))
  const navigation = buildDocTreeFromOutlineDocuments(pages)
  const navPayload: NavigationCachePayload = await writeNavigationCache(lang, navigation)

  return {
    lang,
    generatedAt: docsPayload.generatedAt,
    documents: docsPayload.documents.length,
    navigationRoots: navPayload.navigation.length,
  }
}

export async function refreshAllDocsAndNavigationCache(): Promise<DocsCacheSyncAllResult> {
  const [vi, en] = await Promise.all([
    refreshDocsAndNavigationCache('vi'),
    refreshDocsAndNavigationCache('en'),
  ])

  return { vi, en }
}
