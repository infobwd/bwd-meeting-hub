// BWD Meeting Hub: RLS-gated reader of meeting PDFs.
// FIRST authorize a document ID via the user's meeting_documents RLS.
// THEN use a server-only verified private copy when available; otherwise try the
// existing Google Drive public-link adapter and preserve the Drive fallback.
// Never expose service-role credentials, PDF bytes or real document IDs in code.
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
// These tables have no anon/authenticated privileges or SELECT policies. A
// service-role query occurs ONLY after the user's JWT passes document RLS.
async function readPrivateCopy(supabaseUrl: string, documentId: string): Promise<Uint8Array | null> {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!serviceKey) throw new Error("private_copy_backend_unconfigured");
  const privateHeaders = {
    apikey: serviceKey,
    Authorization: "Bearer " + serviceKey,
    Accept: "application/json",
  };
  async function selectRows(table: string, params: Record<string,string>): Promise<any[]> {
    const url = new URL("/rest/v1/" + table, supabaseUrl);
    for (const [key,value] of Object.entries(params)) url.searchParams.set(key,value);
    const response = await fetch(url, {
      headers: privateHeaders, cache: "no-store", signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("private_copy_database_unavailable");
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error("private_copy_bad_metadata");
    return rows;
  }
  const assets = await selectRows("meeting_document_pdf_assets",{
    select:"document_id,byte_size,part_count,sha256_hex",
    document_id:"eq."+documentId,limit:"1",
  });
  if (assets.length === 0) return null;
  if (assets.length !== 1) throw new Error("private_copy_bad_metadata");
  const asset = assets[0];
  const expectedSize = Number(asset.byte_size);
  const expectedParts = Number(asset.part_count);
  if (!Number.isInteger(expectedSize) || expectedSize < 5 || expectedSize > MAX_BYTES ||
      !Number.isInteger(expectedParts) || expectedParts < 1 || expectedParts > 512 ||
      !/^[a-f0-9]{64}$/.test(String(asset.sha256_hex))) {
    throw new Error("private_copy_bad_metadata");
  }
  const chunks = await selectRows("meeting_document_pdf_chunks",{
    select:"part,content_base64",document_id:"eq."+documentId,
    order:"part.asc",limit:"512",
  });
  if (chunks.length !== expectedParts) throw new Error("private_copy_missing_chunks");
  const pdf = new Uint8Array(expectedSize);
  let offset=0;
  for(let i=0;i<chunks.length;i++){
    const chunk=chunks[i];
    if(chunk.part!==i || typeof chunk.content_base64!=="string" ||
      chunk.content_base64.length>65536 || chunk.content_base64.length%4!==0 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(chunk.content_base64)) {
      throw new Error("private_copy_invalid_chunk");
    }
    let decoded:string;
    try{ decoded=atob(chunk.content_base64); }
    catch{ throw new Error("private_copy_invalid_chunk"); }
    if(offset+decoded.length>pdf.length) throw new Error("private_copy_size_mismatch");
    for(let j=0;j<decoded.length;j++) pdf[offset+j]=decoded.charCodeAt(j);
    offset+=decoded.length;
  }
  if(offset!==expectedSize || String.fromCharCode(...pdf.subarray(0,5))!=="%PDF-"){
    throw new Error("private_copy_size_or_signature_mismatch");
  }
  const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",pdf));
  const hex=Array.from(digest,b=>b.toString(16).padStart(2,"0")).join("");
  if(hex!==asset.sha256_hex) throw new Error("private_copy_checksum_mismatch");
  return pdf;
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
    // Do not attempt a privileged private-copy lookup before RLS authorized
    // this exact meeting-document ID under the caller's JWT above.
    const privateCopy = await readPrivateCopy(supabaseUrl,rows[0].id);
    const bytes = privateCopy ?? await readDrivePdf(rows[0].drive_file_id);
    const h = headers(origin);
    h.set("Content-Type","application/pdf");
    h.set("Content-Length",String(bytes.byteLength));
    h.set("Content-Disposition","inline");
    return new Response(bytes,{status:200,headers:h});
  } catch {
    // If a private reading copy is missing or damaged, fail closed. Do not
    // broaden original Google Drive permissions; frontend preserves Drive Preview.
    return problem(424,"Authenticated PDF unavailable; use Google Drive Preview",origin);
  }
});
