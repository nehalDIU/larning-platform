"use client"

import { useState, useEffect } from "react"
import { Loader2, AlertCircle, FileText, Play, BookOpen, ExternalLink, Maximize2, RotateCcw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useIsMobile } from "@/components/ui/use-mobile"

interface ContentItem {
  type: "slide" | "video" | "document"
  title: string
  url: string
  id: string
  topicTitle?: string
  courseTitle?: string
}

interface ContentViewerProps {
  content: ContentItem
  isLoading?: boolean
}

export function ContentViewer({ content, isLoading = false }: ContentViewerProps) {
  const [iframeLoading, setIframeLoading] = useState(true)
  const [iframeError, setIframeError] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    setIframeLoading(true)
    setIframeError(false)
  }, [content.url])

  const handleIframeLoad = () => {
    setIframeLoading(false)
  }

  const handleIframeError = () => {
    setIframeLoading(false)
    setIframeError(true)
  }

  const handleRetry = () => {
    setIframeError(false)
    setIframeLoading(true)
    // Force iframe reload by changing src
    const iframe = document.querySelector('iframe')
    if (iframe) {
      const src = iframe.src
      iframe.src = ''
      setTimeout(() => {
        iframe.src = src
      }, 100)
    }
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const getContentIcon = () => {
    const iconSize = isMobile ? "h-4 w-4" : "h-5 w-5 lg:h-6 lg:w-6"
    switch (content.type) {
      case "video":
        return <Play className={`${iconSize} text-red-400 flex-shrink-0`} />
      case "slide":
        return <FileText className={`${iconSize} text-blue-400 flex-shrink-0`} />
      case "document":
        return <BookOpen className={`${iconSize} text-green-400 flex-shrink-0`} />
      default:
        return <FileText className={`${iconSize} text-slate-400 flex-shrink-0`} />
    }
  }

  // Fix YouTube URL format
  const getEmbedUrl = (url: string, type: string) => {
    if (type === "video") {
      // Handle various YouTube URL formats
      let videoId = ""

      if (url.includes("youtube.com/watch?v=")) {
        videoId = url.split("v=")[1]?.split("&")[0]
      } else if (url.includes("youtu.be/")) {
        videoId = url.split("youtu.be/")[1]?.split("?")[0]
      } else if (url.includes("youtube.com/embed/")) {
        videoId = url.split("embed/")[1]?.split("?")[0]
      } else if (url.includes("youtube.com/v/")) {
        videoId = url.split("v/")[1]?.split("?")[0]
      }

      if (videoId) {
        // Return proper embed URL with necessary parameters
        return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${typeof window !== "undefined" ? window.location.origin : ""}&rel=0&modestbranding=1`
      }

      // If it's already an embed URL, ensure it has proper parameters
      if (url.includes("youtube.com/embed/")) {
        const baseUrl = url.split("?")[0]
        return `${baseUrl}?enablejsapi=1&origin=${typeof window !== "undefined" ? window.location.origin : ""}&rel=0&modestbranding=1`
      }
    }

    return url
  }

  const openInNewTab = () => {
    if (content.type === "video") {
      // Convert embed URL back to watch URL for better user experience
      const videoId = content.url.match(/embed\/([^?]+)/)?.[1]
      if (videoId) {
        window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank")
        return
      }
    }
    window.open(content.url, "_blank")
  }

  if (isLoading) {
    return (
      <div className="h-full bg-white dark:bg-slate-900 rounded-lg overflow-hidden shadow-lg sm:shadow-2xl flex items-center justify-center">
        <div className="text-center p-4 sm:p-6">
          <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base font-medium">Loading content...</p>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-2">Please wait while we prepare your content</p>
        </div>
      </div>
    )
  }

  const embedUrl = getEmbedUrl(content.url, content.type)

  return (
    <div className={`
      h-full bg-white dark:bg-slate-900 rounded-lg overflow-hidden
      shadow-lg sm:shadow-2xl relative transition-all duration-300
      ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}
    `}>
      {/* Content Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-3 sm:p-4 lg:p-5">
        <div className="flex items-start justify-between text-white gap-2 sm:gap-3">
          <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
            {getContentIcon()}
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm sm:text-base lg:text-lg leading-tight line-clamp-2 mb-1">
                {content.title}
              </h3>
              {content.topicTitle && (
                <p className="text-xs sm:text-sm opacity-80 truncate mb-0.5">{content.topicTitle}</p>
              )}
              {content.courseTitle && (
                <p className="text-xs opacity-70 truncate">{content.courseTitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Badge
              variant="secondary"
              className={`text-xs px-2 py-1 font-medium ${
                content.type === "video"
                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                  : content.type === "slide"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                    : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              }`}
            >
              {content.type}
            </Badge>
            {!isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20 p-1.5 sm:p-2 h-auto touch-manipulation"
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                <Maximize2 className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={openInNewTab}
              className="text-white hover:bg-white/20 p-1.5 sm:p-2 h-auto touch-manipulation"
              title="Open in new tab"
            >
              <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {iframeLoading && (
        <div className="absolute inset-0 bg-white dark:bg-slate-900 flex items-center justify-center z-10">
          <div className="text-center p-4 sm:p-6">
            <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base font-medium mb-2">
              Loading {content.type}...
            </p>
            <div className="flex items-center justify-center gap-2 mt-3">
              {getContentIcon()}
              <span className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs sm:max-w-sm">
                {content.title}
              </span>
            </div>
            <div className="mt-4 w-full max-w-xs mx-auto bg-slate-200 dark:bg-slate-700 rounded-full h-1">
              <div className="bg-blue-500 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {iframeError && (
        <div className="absolute inset-0 bg-white dark:bg-slate-900 flex items-center justify-center z-10 p-4 sm:p-6">
          <div className="text-center max-w-sm sm:max-w-md lg:max-w-lg mx-auto">
            <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16 text-red-400 mx-auto mb-6" />
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-200 mb-3">
              Content Unavailable
            </h3>
            <p className="text-slate-600 dark:text-slate-300 mb-4 text-sm sm:text-base leading-relaxed">
              Unable to load this {content.type}. This might be due to:
            </p>
            <ul className="text-sm text-slate-500 dark:text-slate-400 text-left space-y-2 mb-6 bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                Content is private or restricted
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                Network connectivity issues
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                Invalid or expired link
              </li>
              {content.type === "video" && (
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  Video embedding is disabled
                </li>
              )}
            </ul>
            <div className="space-y-3">
              <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-left">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-300 text-sm">
                  Try refreshing or opening the content in a new tab.
                </AlertDescription>
              </Alert>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleRetry}
                  variant="outline"
                  className="flex-1 touch-manipulation"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
                <Button
                  onClick={openInNewTab}
                  className="flex-1 touch-manipulation"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content iframe */}
      {content.type === "video" ? (
        <iframe
          src={embedUrl}
          className="w-full h-full border-0 bg-black"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title={content.title}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          referrerPolicy="strict-origin-when-cross-origin"
          loading="lazy"
        />
      ) : (
        <iframe
          src={embedUrl}
          className="w-full h-full border-0 bg-white dark:bg-slate-800"
          title={content.title}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          referrerPolicy="strict-origin-when-cross-origin"
          loading="lazy"
        />
      )}

      {/* Fullscreen exit overlay for mobile */}
      {isFullscreen && isMobile && (
        <div className="absolute top-4 right-4 z-30">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="bg-black/50 text-white hover:bg-black/70 p-2 rounded-full"
          >
            <ExternalLink className="h-4 w-4 rotate-180" />
          </Button>
        </div>
      )}
    </div>
  )
}
