function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }

  return data;
}

export default {
  async fetch(request, env, ctx) {
    // Grist configuration
    const GRIST_URL = 'https://grist.narduli.be';
    const DOC_ID = 'onJ2bmcLLGRAABCZkuVphP';
    const TABLE_ID = 'Field';
    const API_KEY = env.GRIST_API_KEY;
    const CACHE_DURATION = 300; // Cache for 5 minutes

    const cache = caches.default;
    const cacheKey = new Request(request.url);

    try {
      // Check cache first
      let response = await cache.match(cacheKey);

      if (!response) {
        // Download CSV from Grist
        const gristResponse = await fetch(
          `${GRIST_URL}/api/docs/${DOC_ID}/download/csv?tableId=${TABLE_ID}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${API_KEY}`
            }
          }
        );

        if (!gristResponse.ok) {
          throw new Error(`Grist API error: ${gristResponse.status}`);
        }

        // Get and parse CSV data
        const csvData = await gristResponse.text();
        const jsonData = parseCSV(csvData);

        // Create response with CORS headers
        response = new Response(
          JSON.stringify(jsonData, null, 2),
          {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, OPTIONS',
              'Cache-Control': `public, max-age=${CACHE_DURATION}`
            },
            status: 200
          }
        );

        // Store in cache
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
      }

      return response;

    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error.message
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 500
        }
      );
    }
  }
};
