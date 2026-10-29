const reply=(status,message)=>Response.json({message},{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const email=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const types=new Set(['Schools','Colleges','Corporate','Government','Retail','Reseller','Others']);
const categories=new Set(['','Smart Interactive Flat Panels','All-in-One PCs','Digital Signage Displays','Indoor LED Display Walls','Outdoor LED Display Walls','Commercial & Professional Displays','Video Conferencing & Audio Systems','AI PTZ Cameras','Teaching Studio & AV Equipment','Display Accessories & Related Hardware']);
export async function handleEnquiry(request,env,fetcher=fetch){
 try{
  const u=new URL(request.url), origin=request.headers.get('origin');
  if(!origin||origin!==u.origin)return reply(403,'This request could not be verified.');
  if(!request.headers.get('content-type')?.startsWith('application/json'))return reply(415,'Invalid request format.');
  const length=Number(request.headers.get('content-length')||0);if(length>16000)return reply(413,'The enquiry is too large.');
  if(!env.RESEND_API_KEY||!env.ENQUIRY_TO||!env.ENQUIRY_FROM||!env.TURNSTILE_SITE_KEY||!env.TURNSTILE_SECRET_KEY)return reply(503,'Enquiry delivery is not configured yet. Please try again later.');
  const reader=request.body?.getReader();if(!reader)return reply(400,'Please check the enquiry details.');let chunks=[],total=0;while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>16000){await reader.cancel();return reply(413,'The enquiry is too large.')}chunks.push(value)}const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}const raw=new TextDecoder().decode(bytes);
  let d;try{d=JSON.parse(raw)}catch{return reply(400,'Please check the enquiry details.');}
  if(!d||typeof d!=='object'||Array.isArray(d))return reply(400,'Please check the enquiry details.');
  const names=['fullName','organisation','email','mobile','customerType','category','brand','size','quantity','location','application','requirements','website','token'];
  if(names.some(k=>d[k]!=null&&typeof d[k]!=='string'))return reply(400,'Please check the enquiry details.');
  for(const k of names)d[k]=(d[k]||'').trim();
  if(d.website)return reply(400,'This enquiry could not be verified.');
  if(!d.fullName||d.fullName.length>120||!d.organisation||d.organisation.length>160||!email.test(d.email)||d.email.length>254||!/^\+?[0-9 ()-]{7,25}$/.test(d.mobile)||!types.has(d.customerType)||!categories.has(d.category)||d.brand.length>120||d.size.length>80||d.location.length>160||d.application.length>300||d.requirements.length>3000||d.token.length>4096||!d.token)return reply(400,'Please check the required fields and try again.');
  if(d.quantity&&(!/^\d{1,5}$/.test(d.quantity)||Number(d.quantity)<1))return reply(400,'Quantity must be a positive whole number.');
  const verified=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:d.token})});
  if(!verified.ok)return reply(503,'Spam verification is temporarily unavailable. Please try again.');
  const verdict=await verified.json();if(!verdict.success||verdict.hostname!==u.hostname)return reply(400,'Verification failed. Please complete the security check and try again.');
  const fields=[['Name',d.fullName],['Organisation',d.organisation],['Email',d.email],['Mobile',d.mobile],['Customer type',d.customerType],['Product category',d.category],['Preferred brand',d.brand],['Panel size',d.size],['Quantity',d.quantity],['Installation location',d.location],['Application',d.application],['Requirements',d.requirements]];
  const sent=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:env.ENQUIRY_FROM,to:[env.ENQUIRY_TO],reply_to:d.email,subject:'New D Tech Solutions enquiry',text:fields.map(([k,v])=>`${k}: ${v||'Not specified'}`).join('\n')})});
  if(!sent.ok)return reply(502,'Your enquiry could not be sent. Please try again later.');
  const result=await sent.json();if(!result.id)return reply(502,'Your enquiry could not be confirmed. Please try again later.');
  return reply(200,'Your enquiry has been accepted for delivery.');
 }catch{return reply(503,'The enquiry service is temporarily unavailable. Please try again later.');}
}
