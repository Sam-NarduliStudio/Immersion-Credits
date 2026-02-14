export default {
  async fetch(request, env) {
    // Grist configuration
    const GRIST_URL = 'https://grist.narduli.be';
    const DOC_ID = 'onJ2bmcLLGRAABCZkuVphP';
    const TABLE_ID = 'Field';
    const API_KEY = env.GRIST_API_KEY; // Store API key as a secret
    
    try {
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
      
      // Get the CSV data
      const csvData = await gristResponse.text();
      
      // Store in R2 bucket
      const filename = `${TABLE_ID}_${Date.now()}.csv`;
      await env.MY_BUCKET.put(filename, csvData, {
        httpMetadata: {
          contentType: 'text/csv',
        }
      });
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `CSV saved as ${filename}`,
          size: csvData.length 
        }),
        { 
          headers: { 'Content-Type': 'application/json' },
          status: 200 
        }
      );
      
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message 
        }),
        { 
          headers: { 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
  }
};
