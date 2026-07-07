'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'

type RefreshResult = {
  success: boolean
  message?: string
  error?: string
  lang?: 'vi' | 'en'
  generatedAt?: string
  total?: number
  documents?: number
  navigationRoots?: number
  results?: {
    vi?: { generatedAt: string; total?: number; documents?: number; navigationRoots?: number }
    en?: { generatedAt: string; total?: number; documents?: number; navigationRoots?: number }
  }
}

async function refreshNavigation(action: string, lang?: 'vi' | 'en'): Promise<RefreshResult> {
  const response = await fetch('/api/admin/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, lang }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Không thể cập nhật menu')
  }

  return result
}

function formatDate(value?: string) {
  if (!value) return 'Chưa có'
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function NavigationAdminPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<RefreshResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRefreshAll = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const nextResult = await refreshNavigation('refresh-docs-cache-all')
      setResult(nextResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Cache tài liệu</h1>
        <p className="mt-2 text-muted-foreground">
          Kéo sẵn toàn bộ danh sách, nội dung tài liệu và menu sidebar từ Outline về file JSON cache trên server.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cập nhật cache thủ công</CardTitle>
          <CardDescription>
            Bấm nút bên dưới sau khi bạn thay đổi tài liệu trong Outline. Hệ thống sẽ tải trước nội dung tài liệu và menu cho cả tiếng Việt và tiếng Anh để lần đầu mở trang không phải chờ Outline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleRefreshAll} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Cập nhật toàn bộ cache từ Outline
          </Button>

          <p className="text-sm text-muted-foreground">
            Lần chạy đầu có thể mất lâu vì phải tải full content từng tài liệu từ Outline. Những lần truy cập tài liệu sau đó sẽ đọc từ cache.
          </p>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result?.success && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-4 flex items-center gap-2 font-medium text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                {result.message || 'Đã cập nhật menu'}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border bg-background p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium">Tiếng Việt</span>
                    <Badge variant="secondary">vi</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Số tài liệu: {result.results?.vi?.documents ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Số mục menu gốc: {result.results?.vi?.navigationRoots ?? result.results?.vi?.total ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Cập nhật: {formatDate(result.results?.vi?.generatedAt)}
                  </p>
                </div>

                <div className="rounded-md border bg-background p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium">English</span>
                    <Badge variant="secondary">en</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Số tài liệu: {result.results?.en?.documents ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Số mục menu gốc: {result.results?.en?.navigationRoots ?? result.results?.en?.total ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Cập nhật: {formatDate(result.results?.en?.generatedAt)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
