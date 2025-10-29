import { auth } from "@/lib/auth";

// Better Auth expects a single handler for all HTTP methods

export async function GET(request: Request) {
  try {
    return await auth.handler(request);
  } catch (error) {
    console.error("Better Auth GET error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(request: Request) {
  try {
    return await auth.handler(request);
  } catch (error) {
    console.error("Better Auth POST error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
