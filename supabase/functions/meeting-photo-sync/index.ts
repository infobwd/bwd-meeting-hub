// UX-10: RLS-aware photo catalog sync from a single configured Google Drive folder.
// The files remain in Drive. Only editors may request sync; no Drive secrets reach the browser.
const ORIGIN="https://infobwd.github.io";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILE_ID=/^[A-Za-z0-9_-]{10,128}$/;
const IMAGES=new Set(["image/jpeg","image/png","image/webp","image/gif"]);
const MAX_FILES=500;
function response(status:number,payload:Record<string,unknown>,origin:string|null){
 const headers:Record<string,string>={
  "Content-Type":"application/json; charset=utf-8",
  "Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff",
  Vary:"Origin",
 };
 if(origin===ORIGIN){headers["Access-Control-Allow-Origin"]=ORIGIN;
  headers["Access-Control-Allow-Headers"]="authorization,apikey,content-type";
  headers["Access-Control-Allow-Methods"]="POST,OPTIONS";}
 return new Response(status===204?null:JSON.stringify(payload),{status,headers});
}
function b64url(bytes:Uint8Array){
 let raw="";for(const b of bytes)raw+=String.fromCharCode(b);
 return btoa(raw).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function b64json(obj:unknown){return b64url(new TextEncoder().encode(JSON.stringify(obj)));}
async function googleToken(json:string):Promise<string>{
 const creds=JSON.parse(json) as Record<string,string>;
 if(!creds.client_email?.endsWith(".gserviceaccount.com")||
    !creds.private_key?.includes("BEGIN PRIVATE KEY"))throw Error("invalid_service_account");
 const pem=creds.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,"");
 const bin=Uint8Array.from(atob(pem),c=>c.charCodeAt(0));
 const key=await crypto.subtle.importKey("pkcs8",bin,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);
 const now=Math.floor(Date.now()/1000);
 const claims={iss:creds.client_email,scope:"https://www.googleapis.com/auth/drive.readonly",
  aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600};
 const data=b64json({alg:"RS256",typ:"JWT"})+"."+b64json(claims);
 const signature=new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,new TextEncoder().encode(data)));
 const grant=new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:data+"."+b64url(signature)});
 const result=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:grant,signal:AbortSignal.timeout(12000)});
 if(!result.ok)throw Error("google_auth_failed");
 const token=await result.json();if(!token.access_token)throw Error("google_token_missing");
 return token.access_token as string;
}
async function listFolder(folder:string,token:string){
 const result:Array<{drive_file_id:string,file_name:string,mime_type:string}>=[];
 let page:string|null=null;
 for(let i=0;i<5;i++){
  const url=new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q",`'${folder}' in parents and trashed = false`);
  url.searchParams.set("fields","nextPageToken,files(id,name,mimeType)");
  url.searchParams.set("pageSize","100");
  url.searchParams.set("supportsAllDrives","true");
  url.searchParams.set("includeItemsFromAllDrives","true");
  if(page)url.searchParams.set("pageToken",page);
  const res=await fetch(url,{headers:{Authorization:"Bearer "+token,Accept:"application/json"},
    signal:AbortSignal.timeout(15000)});
  if(!res.ok)throw Error(res.status===403?"drive_folder_access_denied":"drive_listing_unavailable");
  const json=await res.json();
  for(const f of json.files||[]){
   if(FILE_ID.test(f.id||"")&&IMAGES.has(f.mimeType)&&typeof f.name==="string"){
    result.push({drive_file_id:f.id,file_name:f.name.slice(0,250)||"ภาพการประชุม",mime_type:f.mimeType});
   }
  }
  page=json.nextPageToken||null;
  if(!page)return result;
 }
 // Do not report a partial scan as an authoritative sync.
 throw Error("drive_folder_too_large");
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin");
 if(origin&&origin!==ORIGIN)return response(403,{error:"Origin not allowed"},null);
 if(req.method==="OPTIONS")return response(204,{},origin);
 if(req.method!=="POST")return response(405,{error:"Method not allowed"},origin);
 const jwt=req.headers.get("authorization")||"";
 if(!/^Bearer\s+[^\s]+$/i.test(jwt))return response(401,{error:"Login required"},origin);
 const url=Deno.env.get("SUPABASE_URL")||"";
 const anon=Deno.env.get("SUPABASE_ANON_KEY")||"";
 const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||
  (()=>{try{return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||"";}catch{return "";}})();
 if(!url||!anon||!secret)return response(503,{error:"Supabase backend unavailable"},origin);
 let id="";
 try{
  const data=await req.json();
  id=typeof data?.meeting_id==="string"?data.meeting_id:"";
  if(!UUID.test(id))return response(400,{error:"Invalid meeting ID"},origin);
 }catch{return response(400,{error:"Invalid JSON"},origin);}
 const apiHeaders={apikey:anon,Authorization:jwt,Accept:"application/json"};
 const read=async(path:string)=>{
  const res=await fetch(new URL(path,url),{headers:apiHeaders,signal:AbortSignal.timeout(9000),cache:"no-store"});
  if(!res.ok)throw Error("supabase_read_denied");
  return res.json();
 };
 let folder="";
 try{
  const userRes=await fetch(new URL("/auth/v1/user",url),{headers:apiHeaders,signal:AbortSignal.timeout(9000)});
  if(!userRes.ok)return response(401,{error:"Session expired"},origin);
  const user=await userRes.json();if(!UUID.test(user.id||""))return response(403,{error:"Not a user"},origin);
  const membership=await read("/rest/v1/workspace_members?select=role,active&user_id=eq."+encodeURIComponent(user.id)+"&limit=1");
  if(!membership[0]?.active)return response(403,{error:"Not a member"},origin);
  const meetings=await read("/rest/v1/meetings?select=id,photo_drive_folder_id&id=eq."+encodeURIComponent(id)+"&limit=1");
  if(meetings.length!==1)return response(404,{error:"Meeting inaccessible"},origin);
  if(membership[0].role!=="admin"){
   const grants=await read("/rest/v1/meeting_access?select=role&meeting_id=eq."+encodeURIComponent(id)+"&user_id=eq."+encodeURIComponent(user.id)+"&limit=1");
   if(grants[0]?.role!=="editor")return response(403,{error:"Editor permission required"},origin);
  }
  folder=meetings[0].photo_drive_folder_id||"";
  if(!FILE_ID.test(folder))return response(422,{error:"Please select a photo folder first"},origin);
 }catch{return response(502,{error:"Unable to check permissions"},origin);}
 const credentials=Deno.env.get("GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON")||"";
 if(!credentials)return response(503,{error:"Google Drive sync not configured; catalog remains available"},origin);
 let files:Array<{drive_file_id:string,file_name:string,mime_type:string}>;
 try{
  const token=await googleToken(credentials);
  files=await listFolder(folder,token);
 }catch(e){
  const reason=e instanceof Error?e.message:"drive_unavailable";
  return response(424,{error:"Google Drive unavailable",reason},origin);
 }
 if(files.length>MAX_FILES)return response(413,{error:"Too many images in Drive folder"},origin);
 if(!files.length)return response(200,{synced:0,message:"No image files found; prior catalog retained"},origin);
 const serviceHeaders={apikey:secret,Authorization:"Bearer "+secret,Accept:"application/json",
   "Content-Type":"application/json","Prefer":"resolution=merge-duplicates,return=minimal"};
 const updated=await fetch(new URL("/rest/v1/meeting_photo_catalog?on_conflict=meeting_id,drive_file_id",url),{
  method:"POST",headers:serviceHeaders,
  body:JSON.stringify(files.map(f=>({meeting_id:id,...f,last_seen_at:new Date().toISOString()}))),
  signal:AbortSignal.timeout(15000),
 });
 if(!updated.ok)return response(502,{error:"Unable to update photo catalog"},origin);
 return response(200,{synced:files.length,message:"Photo catalog refreshed"},origin);
});
