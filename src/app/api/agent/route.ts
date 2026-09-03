import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { task } = await request.json();

  console.log("Agent task:", task);

  return NextResponse.json({
    message: "Task received",
    task,
  });
}