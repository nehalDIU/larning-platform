import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Use a single optimized query with joins
    const { data, error } = await supabase
      .from("topics")
      .select(`
        *,
        slides!inner(*),
        videos!inner(*)
      `)
      .eq("course_id", params.id)
      .order("order_index", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform the data to organize slides and videos by topic
    const transformedData = (data || []).map((topic) => ({
      ...topic,
      slides: topic.slides?.sort((a: any, b: any) => a.order_index - b.order_index) || [],
      videos: topic.videos?.sort((a: any, b: any) => a.order_index - b.order_index) || [],
    }))

    return NextResponse.json(transformedData)
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from("topics")
      .insert({
        ...body,
        course_id: params.id,
      })
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data[0])
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
