import type { NextRequest } from "next/server";

const REQUEST_HEADERS = ["accept", "authorization", "content-type", "idempotency-key"];
const RESPONSE_HEADERS = ["cache-control", "content-type", "retry-after"];

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxyRequest(request: NextRequest, { params }: RouteContext) {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!configuredBaseUrl) {
    return Response.json(
      { success: false, message: "The API server is not configured." },
      { status: 503 },
    );
  }

  let upstreamUrl: URL;
  try {
    const baseUrl = new URL(configuredBaseUrl);
    if (
      (baseUrl.protocol !== "https:" && baseUrl.protocol !== "http:") ||
      (process.env.NODE_ENV === "production" && baseUrl.protocol !== "https:")
    ) {
      throw new Error("Unsupported API URL protocol.");
    }

    const { path } = await params;
    if (path.some((segment) => segment === "." || segment === "..")) {
      return Response.json({ success: false, message: "Invalid API path." }, { status: 400 });
    }

    upstreamUrl = new URL(
      path.map((segment) => encodeURIComponent(segment)).join("/"),
      `${baseUrl.href.replace(/\/+$/, "")}/`,
    );
    upstreamUrl.search = request.nextUrl.search;
  } catch {
    return Response.json(
      { success: false, message: "The configured API URL is invalid." },
      { status: 500 },
    );
  }

  const headers = new Headers();
  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, init);
    const responseHeaders = new Headers();
    for (const name of RESPONSE_HEADERS) {
      const value = upstreamResponse.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("The upstream API request failed.", error);
    return Response.json(
      { success: false, message: "The API server could not be reached. Please try again." },
      { status: 502 },
    );
  }
}

export const GET = proxyRequest;
export const HEAD = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
