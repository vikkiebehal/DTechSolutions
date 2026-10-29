import { env } from 'cloudflare:workers';
import { handleEnquiry } from '../../../lib/enquiry.mjs';
export const dynamic = 'force-dynamic';
export async function GET() {
  const e = env as unknown as Record<string,string>;
  const ready = Boolean(e.RESEND_API_KEY && e.ENQUIRY_TO && e.ENQUIRY_FROM && e.TURNSTILE_SITE_KEY && e.TURNSTILE_SECRET_KEY);
  return Response.json({ready, siteKey:ready ? e.TURNSTILE_SITE_KEY : null}, {headers:{'Cache-Control':'no-store'}});
}
export async function POST(request: Request) { return handleEnquiry(request, env as unknown as Record<string,string>); }
