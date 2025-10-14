import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const display = searchParams.get('display');
  const start = searchParams.get('start');
  const sort = searchParams.get('sort');

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  // --- DEBUGGING START ---
  console.log('--- API Route Debugging ---');
  console.log('NAVER_CLIENT_ID loaded:', clientId ? `Yes, ends with ...${clientId.slice(-4)}` : 'No');
  console.log('NAVER_CLIENT_SECRET loaded:', clientSecret ? `Yes, ends with ...${clientSecret.slice(-4)}` : 'No');
  console.log('---------------------------');
  // --- DEBUGGING END ---

  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: 'Naver API credentials are not set in environment variables.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!query) {
    return new Response(JSON.stringify({ error: 'Query parameter is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiUrl = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=${display}&start=${start}&sort=${sort}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      return new Response(JSON.stringify({ error: `Naver API error: ${errorData}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch from Naver API.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
