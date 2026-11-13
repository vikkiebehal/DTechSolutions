import { htmlForRequest } from "./site-html";
export function GET(request: Request) { return new Response(htmlForRequest(request), {headers: {"content-type": "text/html; charset=utf-8"}}); }
