function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return [];

  // Parse a CSV line handling quoted fields
  function parseLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current); // Add last field
    return result;
  }

  const headers = parseLine(lines[0]);
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }

  return data;
}

// Shared function to process data from Grist
async function processGristData(env) {
  const GRIST_URL = 'https://grist.narduli.be';
  const DOC_ID = 'onJ2bmcLLGRAABCZkuVphP';
  const TABLE_ID = 'Field';
  const API_KEY = env.GRIST_API_KEY;

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
  let jsonData = parseCSV(csvData);

  // Filter by Release = true
  jsonData = jsonData.filter(record => record.Release === 'true' || record.Release === true);

  // Deduplicate by all fields that matter for display
  const seen = new Map();
  jsonData = jsonData.filter(record => {
    // Create unique key from all displayed fields
    const key = [
      record.Context || '',
      record['Display Name'] || '',
      record.Alt || '',
      record.Location || '',
      record['Credit/Institutions'] || ''
    ].join('|');

    if (seen.has(key)) {
      return false; // Skip duplicate
    }
    seen.set(key, true);
    return true;
  });

  return jsonData;
}

export default {
  // Scheduled event handler - runs on CRON schedule
  async scheduled(event, env, ctx) {
    try {
      console.log('Running scheduled data update...');

      const jsonData = await processGristData(env);

      // Store in R2
      await env.IMMERSION_BUCKET.put(
        'credits.json',
        JSON.stringify(jsonData, null, 2),
        {
          httpMetadata: {
            contentType: 'application/json'
          }
        }
      );

      console.log(`Stored ${jsonData.length} records to R2`);
    } catch (error) {
      console.error('Scheduled update failed:', error);
    }
  },

  // HTTP request handler - serves data from R2
  async fetch(request, env, ctx) {
    try {
      // Get data from R2
      const object = await env.IMMERSION_BUCKET.get('credits.json');

      if (!object) {
        // If R2 data doesn't exist yet, fetch and store it
        const jsonData = await processGristData(env);

        await env.IMMERSION_BUCKET.put(
          'credits.json',
          JSON.stringify(jsonData, null, 2),
          {
            httpMetadata: {
              contentType: 'application/json'
            }
          }
        );

        return new Response(
          JSON.stringify(jsonData, null, 2),
          {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, OPTIONS',
              'Cache-Control': 'public, max-age=300'
            },
            status: 200
          }
        );
      }

      // Return data from R2
      return new Response(
        await object.text(),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Cache-Control': 'public, max-age=300'
          },
          status: 200
        }
      );

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
