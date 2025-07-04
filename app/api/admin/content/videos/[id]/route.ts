import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { title, url, topic_id, order_index } = body
    const id = params.id // UUID string

    // build update object only with provided fields
    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (url !== undefined) updateData.youtube_url = url
    if (topic_id !== undefined) updateData.topic_id = topic_id
    if (order_index !== undefined) updateData.order_index = order_index

    const supabase = createClient()

    const { data, error } = await supabase
      .from("videos")
      .update(updateData)
      .eq("id", id)
      .select(`
        id,
        title,
        youtube_url,
        order_index,
        topic_id,
        topic:topics (
          title,
          course:courses (
            title,
            semester:semesters ( title )
          )
        )
      `)
      .single()

    if (error) {
      console.error("[videos] PATCH error:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ...data,
      url: data.youtube_url,
      topic: {
        ...data.topic,
        course: {
          ...data.topic.course,
          semester: { name: data.topic.course.semester?.title || "" },
        },
      },
    })
  } catch (err) {
    console.error("[videos] PATCH error:", err)
    return NextResponse.json({ error: "Failed to update video" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const supabase = createClient()

    const { error } = await supabase.from("videos").delete().eq("id", id)

    if (error) {
      console.error("[videos] DELETE error:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[videos] DELETE error:", err)
    return NextResponse.json({ error: "Failed to delete video" }, { status: 500 })
  }
}
