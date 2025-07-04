"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { ChevronDown, ChevronRight, FileText, Play, BookOpen, Users, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/supabase"
import React from "react"

type Semester = Database["public"]["Tables"]["semesters"]["Row"]
type Course = Database["public"]["Tables"]["courses"]["Row"]
type Topic = Database["public"]["Tables"]["topics"]["Row"]
type Slide = Database["public"]["Tables"]["slides"]["Row"]
type Video = Database["public"]["Tables"]["videos"]["Row"]
type StudyTool = Database["public"]["Tables"]["study_tools"]["Row"]

interface ContentItem {
  type: "slide" | "video" | "document"
  title: string
  url: string
  id: string
  topicTitle?: string
  courseTitle?: string
}

interface FunctionalSidebarProps {
  onContentSelect: (content: ContentItem) => void
}

// Cache for storing fetched data
const dataCache = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Helper function to get cached data or fetch new data
const getCachedData = async (key: string, fetchFn: () => Promise<any>): Promise<any> => {
  const cached = dataCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  const data = await fetchFn()
  dataCache.set(key, { data, timestamp: Date.now() })
  return data
}

export function FunctionalSidebar({ onContentSelect }: FunctionalSidebarProps) {
  const [semesters, setSemesters] = useState([])
  const [selectedSemester, setSelectedSemester] = useState("")
  const [courses, setCourses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Expansion states
  const [expandedCourses, setExpandedCourses] = useState(new Set())
  const [expandedStudyTools, setExpandedStudyTools] = useState(new Set())
  const [expandedTopics, setExpandedTopics] = useState(new Set())
  const [expandedTopicItems, setExpandedTopicItems] = useState(new Set())

  // Course data cache with loading states
  const [courseData, setCourseData] = useState({})

  // Fetch semesters on component mount
  useEffect(() => {
    fetchSemesters()
  }, [])

  // Fetch courses when semester changes
  useEffect(() => {
    if (selectedSemester) {
      fetchCourses(selectedSemester)
    }
  }, [selectedSemester])

  const fetchSemesters = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const data = await getCachedData("semesters", async () => {
        const { data, error } = await supabase.from("semesters").select("*").order("created_at", { ascending: false })
        if (error) throw error
        return data || []
      })

      setSemesters(data)

      // Auto-select first semester
      if (data && data.length > 0) {
        setSelectedSemester(data[0].id)
      }
    } catch (err) {
      console.error("Error fetching semesters:", err)
      setError("Failed to load semesters")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCourses = async (semesterId: string) => {
    try {
      setError(null)

      const data = await getCachedData(`courses-${semesterId}`, async () => {
        const { data, error } = await supabase
          .from("courses")
          .select("*")
          .eq("semester_id", semesterId)
          .order("created_at", { ascending: true })
        if (error) throw error
        return data || []
      })

      setCourses(data)
    } catch (err) {
      console.error("Error fetching courses:", err)
      setError("Failed to load courses")
    }
  }

  const fetchCourseData = async (courseId: string) => {
    if (courseData[courseId] && !courseData[courseId].isLoading) return

    // Set loading state
    setCourseData((prev) => ({
      ...prev,
      [courseId]: {
        topics: [],
        studyTools: [],
        slides: {},
        videos: {},
        isLoading: true,
      },
    }))

    try {
      // Use optimized single query to fetch all course data
      const data = await getCachedData(`course-data-${courseId}`, async () => {
        // Fetch all data in parallel
        const [topicsResult, studyToolsResult] = await Promise.all([
          supabase
            .from("topics")
            .select(`
              *,
              slides(*),
              videos(*)
            `)
            .eq("course_id", courseId)
            .order("order_index", { ascending: true }),
          supabase.from("study_tools").select("*").eq("course_id", courseId),
        ])

        if (topicsResult.error) throw topicsResult.error
        if (studyToolsResult.error) throw studyToolsResult.error

        // Organize slides and videos by topic
        const slides = {}
        const videos = {}

        topicsResult.data?.forEach((topic) => {
          slides[topic.id] = (topic.slides || []).sort((a, b) => a.order_index - b.order_index)
          videos[topic.id] = (topic.videos || []).sort((a, b) => a.order_index - b.order_index)
        })

        return {
          topics: topicsResult.data || [],
          studyTools: studyToolsResult.data || [],
          slides,
          videos,
        }
      })

      setCourseData((prev) => ({
        ...prev,
        [courseId]: {
          ...data,
          isLoading: false,
        },
      }))
    } catch (err) {
      console.error("Error fetching course data:", err)
      setError("Failed to load course content")
      setCourseData((prev) => ({
        ...prev,
        [courseId]: {
          topics: [],
          studyTools: [],
          slides: {},
          videos: {},
          isLoading: false,
        },
      }))
    }
  }

  // Optimized toggle functions with debouncing
  const toggleCourse = useCallback((courseId: string) => {
    setExpandedCourses((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(courseId)) {
        newSet.delete(courseId)
      } else {
        newSet.add(courseId)
        // Only fetch data when expanding
        setTimeout(() => fetchCourseData(courseId), 0)
      }
      return newSet
    })
  }, [])

  const toggleStudyTools = useCallback((courseId: string) => {
    setExpandedStudyTools((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(courseId)) {
        newSet.delete(courseId)
      } else {
        newSet.add(courseId)
      }
      return newSet
    })
  }, [])

  const toggleTopics = useCallback((courseId: string) => {
    setExpandedTopics((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(courseId)) {
        newSet.delete(courseId)
      } else {
        newSet.add(courseId)
      }
      return newSet
    })
  }, [])

  const toggleTopicItem = useCallback((topicId: string) => {
    setExpandedTopicItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(topicId)) {
        newSet.delete(topicId)
      } else {
        newSet.add(topicId)
      }
      return newSet
    })
  }, [])

  // Content selection handlers
  const handleContentClick = useCallback(
    (
      type: "slide" | "video" | "document",
      title: string,
      url: string,
      id: string,
      topicTitle?: string,
      courseTitle?: string,
    ) => {
      onContentSelect({
        type,
        title,
        url,
        id,
        topicTitle,
        courseTitle,
      })
    },
    [onContentSelect],
  )

  // Memoized utility functions
  const getStudyToolIcon = useCallback((type: string) => {
    switch (type) {
      case "previous_questions":
        return <FileText className="h-4 w-4 text-blue-400" />
      case "exam_note":
        return <BookOpen className="h-4 w-4 text-green-400" />
      case "syllabus":
        return <FileText className="h-4 w-4 text-purple-400" />
      case "mark_distribution":
        return <Users className="h-4 w-4 text-orange-400" />
      default:
        return <FileText className="h-4 w-4 text-slate-400" />
    }
  }, [])

  const getStudyToolLabel = useCallback((type: string) => {
    switch (type) {
      case "previous_questions":
        return "Previous Questions"
      case "exam_note":
        return "Exam Notes"
      case "syllabus":
        return "Syllabus"
      case "mark_distribution":
        return "Mark Distribution"
      default:
        return type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())
    }
  }, [])

  // Memoized filtered courses
  const filteredCourses = useMemo(() => {
    return courses
  }, [courses])

  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-slate-900">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-teal-400 mx-auto mb-4" />
            <p className="text-slate-400">Loading courses...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Course Content</h3>

        {/* Semester Selection */}
        <Select value={selectedSemester} onValueChange={setSelectedSemester}>
          <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
            <SelectValue placeholder="Select Semester" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600">
            {semesters.map((semester) => (
              <SelectItem key={semester.id} value={semester.id} className="text-white hover:bg-slate-700">
                {semester.title} {semester.section && `(${semester.section})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4">
          <Alert className="bg-red-900/20 border-red-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-200">{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Course List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {filteredCourses.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-8 w-8 text-slate-400 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No courses available</p>
            </div>
          ) : (
            filteredCourses.map((course) => (
              <CourseItem
                key={course.id}
                course={course}
                courseData={courseData[course.id]}
                expandedCourses={expandedCourses}
                expandedStudyTools={expandedStudyTools}
                expandedTopics={expandedTopics}
                expandedTopicItems={expandedTopicItems}
                onToggleCourse={toggleCourse}
                onToggleStudyTools={toggleStudyTools}
                onToggleTopics={toggleTopics}
                onToggleTopicItem={toggleTopicItem}
                onContentClick={handleContentClick}
                getStudyToolIcon={getStudyToolIcon}
                getStudyToolLabel={getStudyToolLabel}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// Memoized CourseItem component to prevent unnecessary re-renders
const CourseItem = React.memo(
  ({
    course,
    courseData,
    expandedCourses,
    expandedStudyTools,
    expandedTopics,
    expandedTopicItems,
    onToggleCourse,
    onToggleStudyTools,
    onToggleTopics,
    onToggleTopicItem,
    onContentClick,
    getStudyToolIcon,
    getStudyToolLabel,
  }: {
    course: Course
    courseData?: any
    expandedCourses: Set<string>
    expandedStudyTools: Set<string>
    expandedTopics: Set<string>
    expandedTopicItems: Set<string>
    onToggleCourse: (id: string) => void
    onToggleStudyTools: (id: string) => void
    onToggleTopics: (id: string) => void
    onToggleTopicItem: (id: string) => void
    onContentClick: (
      type: any,
      title: string,
      url: string,
      id: string,
      topicTitle?: string,
      courseTitle?: string,
    ) => void
    getStudyToolIcon: (type: string) => React.ReactNode
    getStudyToolLabel: (type: string) => string
  }) => {
    return (
      <div className="space-y-1">
        {/* Course Header */}
        <div className="bg-slate-800 rounded-lg p-3 hover:bg-slate-750 transition-colors">
          <Button
            variant="ghost"
            className="w-full justify-start text-left p-0 h-auto hover:bg-transparent"
            onClick={() => onToggleCourse(course.id)}
          >
            <div className="flex items-center gap-2 w-full">
              {expandedCourses.has(course.id) ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-white truncate">{course.title}</div>
                <div className="text-xs text-slate-400">({course.course_code})</div>
                <div className="text-xs text-slate-500">{course.teacher_name}</div>

                {courseData && !courseData.isLoading && (
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-300">
                      {courseData.topics.length} Topics
                    </Badge>
                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                      {Object.values(courseData.slides).flat().length} Slides
                    </Badge>
                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                      {Object.values(courseData.videos).flat().length} Videos
                    </Badge>
                  </div>
                )}

                {courseData?.isLoading && (
                  <div className="flex items-center gap-2 mt-2">
                    <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                    <span className="text-xs text-slate-400">Loading content...</span>
                  </div>
                )}
              </div>
            </div>
          </Button>
        </div>

        {/* Course Content */}
        {expandedCourses.has(course.id) && courseData && !courseData.isLoading && (
          <div className="ml-4 space-y-2">
            {/* Study Tools Section */}
            {courseData.studyTools.length > 0 && (
              <div>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left p-2 h-auto hover:bg-slate-800 rounded-md"
                  onClick={() => onToggleStudyTools(course.id)}
                >
                  <div className="flex items-center gap-2">
                    {expandedStudyTools.has(course.id) ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                    <BookOpen className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-white">Study Resources</span>
                    <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-300 ml-auto">
                      {courseData.studyTools.length}
                    </Badge>
                  </div>
                </Button>

                {expandedStudyTools.has(course.id) && (
                  <div className="ml-6 space-y-1">
                    {courseData.studyTools.map((tool: StudyTool) => (
                      <Button
                        key={tool.id}
                        variant="ghost"
                        className="w-full justify-start text-left p-2 h-auto hover:bg-slate-800 rounded-md"
                        onClick={() =>
                          tool.content_url &&
                          onContentClick("document", tool.title, tool.content_url, tool.id, undefined, course.title)
                        }
                        disabled={!tool.content_url}
                      >
                        <div className="flex items-center gap-2">
                          {getStudyToolIcon(tool.type)}
                          <span className="text-xs text-slate-300">{getStudyToolLabel(tool.type)}</span>
                          {tool.exam_type !== "both" && (
                            <Badge variant="outline" className="text-xs border-slate-600 text-slate-400 ml-auto">
                              {tool.exam_type}
                            </Badge>
                          )}
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Topics Section */}
            {courseData.topics.length > 0 && (
              <div>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left p-2 h-auto hover:bg-slate-800 rounded-md"
                  onClick={() => onToggleTopics(course.id)}
                >
                  <div className="flex items-center gap-2">
                    {expandedTopics.has(course.id) ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                    <FileText className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-white">Topics</span>
                    <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-300 ml-auto">
                      {courseData.topics.length}
                    </Badge>
                  </div>
                </Button>

                {expandedTopics.has(course.id) && (
                  <div className="ml-6 space-y-1">
                    {courseData.topics.map((topic: Topic, index: number) => {
                      const topicSlides = courseData.slides[topic.id] || []
                      const topicVideos = courseData.videos[topic.id] || []

                      return (
                        <div key={topic.id}>
                          <Button
                            variant="ghost"
                            className="w-full justify-start text-left p-2 h-auto hover:bg-slate-800 rounded-md"
                            onClick={() => onToggleTopicItem(topic.id)}
                          >
                            <div className="flex items-center gap-2 w-full">
                              {expandedTopicItems.has(topic.id) ? (
                                <ChevronDown className="h-3 w-3 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-3 w-3 text-slate-400" />
                              )}
                              <span className="text-sm flex-1 text-slate-300 truncate">
                                {index + 1}. {topic.title}
                              </span>
                            </div>
                          </Button>

                          {expandedTopicItems.has(topic.id) && (
                            <div className="ml-6 space-y-1">
                              {/* Videos */}
                              {topicVideos.map((video: Video, videoIndex: number) => (
                                <Button
                                  key={video.id}
                                  variant="ghost"
                                  className="w-full justify-start text-left p-2 h-auto hover:bg-slate-800 rounded-md group"
                                  onClick={() =>
                                    onContentClick(
                                      "video",
                                      video.title,
                                      video.youtube_url,
                                      video.id,
                                      topic.title,
                                      course.title,
                                    )
                                  }
                                >
                                  <div className="flex items-center gap-2">
                                    <Play className="h-3 w-3 text-red-400" />
                                    <span className="text-xs text-slate-300 group-hover:text-white truncate">
                                      {videoIndex + 1}. {video.title}
                                    </span>
                                  </div>
                                </Button>
                              ))}

                              {/* Slides */}
                              {topicSlides.map((slide: Slide, slideIndex: number) => (
                                <Button
                                  key={slide.id}
                                  variant="ghost"
                                  className="w-full justify-start text-left p-2 h-auto hover:bg-slate-800 rounded-md group"
                                  onClick={() =>
                                    onContentClick(
                                      "slide",
                                      slide.title,
                                      slide.google_drive_url,
                                      slide.id,
                                      topic.title,
                                      course.title,
                                    )
                                  }
                                >
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-3 w-3 text-blue-400" />
                                    <span className="text-xs text-slate-300 group-hover:text-white truncate">
                                      {topicVideos.length + slideIndex + 1}. {slide.title}
                                    </span>
                                  </div>
                                </Button>
                              ))}

                              {topicSlides.length === 0 && topicVideos.length === 0 && (
                                <div className="text-xs text-slate-500 py-2 pl-2">No content available</div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Empty state for course with no content */}
            {courseData.topics.length === 0 && courseData.studyTools.length === 0 && (
              <div className="text-center py-4">
                <p className="text-xs text-slate-500">No content available for this course</p>
              </div>
            )}
          </div>
        )}
      </div>
    )
  },
)

CourseItem.displayName = "CourseItem"
