// BWD Meeting Hub: RLS-gated Google Drive PDF reader adapter.
// Reads ONLY a meeting-document ID visible to the Supabase JWT caller.
// Downloads public-link-accessible Drive PDF on the server and never stores it.
// Files restricted in Google Drive must use Drive Preview or future OAuth.
const ALLOWED_ORIGIN = "https://infobwd.github.io";
const MAX_BYTES = 40 * 1024 * 1024;
const REDIRECT_LIMIT = 4;
const ALLOWED_DRIVE_HOST = /^(drive\.google\.com|drive\.usercontent\.google\.com|[a-z0-9-]+\.googleusercontent\.com)$/i;

function headers(origin: string | null): Headers {
  const h = new Headers({
    "Cache-Control": "private, no-store",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  });
  if (origin === ALLOWED_ORIGIN) {
    h.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    h.set("Access-Control-Allow-Headers", "authorization, apikey, content-type");
    h.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  }
  return h;
}
function problem(status: number, message: string, origin: string | null) {
  const h = headers(origin);
  h.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify({error:message}), {status,headers:h});
}
async function readDriveEndpoint(url: URL): Promise<Uint8Array> {
  for (let hop = 0; hop <= REDIRECT_LIMIT; hop++) {
    if (url.protocol !== "https:" || !ALLOWED_DRIVE_HOST.test(url.hostname)) throw new Error("disallowed_redirect");
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(14000),
      headers: {Accept: "application/pdf,application/octet-stream;q=0.8"},
    });
    if ([301,302,303,307,308].includes(response.status)) {
      const next = response.headers.get("location");
      await response.body?.cancel();
      if (!next || hop === REDIRECT_LIMIT) throw new Error("redirect_failure");
      url = new URL(next,url);
      continue;
    }
    if (!response.ok || !response.body) throw new Error("drive_unavailable");
    const indicated = Number(response.headers.get("content-length") || 0);
    if (indicated > MAX_BYTES) {
      await response.body.cancel();
      throw new Error("document_too_large");
    }
    let size = 0;
    const chunks: Uint8Array[] = [];
    const reader = response.body.getReader();
    try {
      while (true) {
        const {done,value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) throw new Error("document_too_large");
        chunks.push(value);
      }
    } finally {
      try { await reader.cancel(); } catch { /* response already closed */ }
      reader.releaseLock();
    }
    if (size < 5) throw new Error("not_a_pdf");
    const data = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { data.set(chunk,offset); offset += chunk.byteLength; }
    if (String.fromCharCode(...data.subarray(0,5)) !== "%PDF-") throw new Error("not_a_pdf");
    return data;
  }
  throw new Error("redirect_failure");
}
async function readDrivePdf(fileId: string): Promise<Uint8Array> {
  if (!/^[A-Za-z0-9_-]{10,128}$/.test(fileId)) throw new Error("invalid_drive_file_id");
  const candidates = [
    "https://drive.usercontent.google.com/download?id="+encodeURIComponent(fileId)+"&export=download&confirm=t",
    "https://drive.google.com/uc?export=download&id="+encodeURIComponent(fileId),
  ];
  let error: unknown = null;
  for (const candidate of candidates) {
    try { return await readDriveEndpoint(new URL(candidate)); }
    catch (err) { error = err; if (err instanceof Error && err.message === "document_too_large") throw err; }
  }
  throw error || new Error("drive_unavailable");
}
Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  if (origin && origin !== ALLOWED_ORIGIN) return problem(403,"Origin not allowed",null);
  if (request.method === "OPTIONS") return new Response(null,{status:204,headers:headers(origin)});
  if (request.method !== "GET") return problem(405,"Method not allowed",origin);

  const input = new URL(request.url);
  const docId = input.searchParams.get("document_id") || "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(docId)) {
    return problem(400,"Invalid document ID",origin);
  }
  const auth = request.headers.get("authorization") || "";
  if (!/^Bearer\s+[^\s]+$/i.test(auth)) return problem(401,"Authentication required",origin);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!supabaseUrl || !anonKey) return problem(503,"Backend not configured",origin);
  // REST enforces meeting_documents SELECT RLS under the caller's JWT.
  const query = new URL("/rest/v1/meeting_documents",supabaseUrl);
  query.searchParams.set("select","id,drive_file_id");
  query.searchParams.set("id","eq."+docId);
  query.searchParams.set("limit","1");
  let rows: Array<{id:string;drive_file_id:string}>;
  try {
    const lookup = await fetch(query,{
      headers: {apikey:anonKey,Authorization:auth,Accept:"application/json"},
      signal:AbortSignal.timeout(8000),
      cache:"no-store",
    });
    if (lookup.status === 401 || lookup.status === 403) return problem(403,"Access denied",origin);
    if (!lookup.ok) return problem(502,"Document authorization unavailable",origin);
    rows = await lookup.json();
    if (!Array.isArray(rows) || rows.length !== 1) return problem(404,"Document not accessible",origin);
  } catch {
    return problem(502,"Document authorization unavailable",origin);
  }
  try {
    const bytes = await readDrivePdf(rows[0].drive_file_id);
    const h = headers(origin);
    h.set("Content-Type","application/pdf");
    h.set("Content-Length",String(bytes.byteLength));
    h.set("Content-Disposition","inline");
    return new Response(bytes,{status:200,headers:h});
  } catch {
    // Restricted Google Drive files cannot be fetched from the public-link path.
    // Do not bypass Drive permissions: frontend offers Drive Preview instead.
    return problem(424,"Could not retrieve PDF for book reader; use Google Drive Preview",origin);
  }
});
