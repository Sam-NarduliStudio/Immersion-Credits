# Webflow Integration Instructions

## Step 1: Deploy Your Worker

```bash
wrangler deploy
```

After deployment, you'll get a URL like: `https://grist-csv-downloader.YOUR-SUBDOMAIN.workers.dev`

## Step 2: Test Your Worker

Visit the URL in your browser. You should see JSON data from your Grist table.

## Step 3: Add to Webflow

### Option A: Using Webflow's Embed Element

1. In Webflow Designer, drag an **Embed** element where you want your table
2. Paste this code:

```html
<div id="grid-wrapper"></div>

<link href="https://cdn.jsdelivr.net/npm/gridjs/dist/theme/mermaid.min.css" rel="stylesheet" />
<script src="https://cdn.jsdelivr.net/npm/gridjs/dist/gridjs.umd.js"></script>

<script>
const WORKER_URL = 'https://grist-csv-downloader.YOUR-SUBDOMAIN.workers.dev';

fetch(WORKER_URL)
  .then(response => response.json())
  .then(data => {
    new gridjs.Grid({
      columns: Object.keys(data[0] || {}),
      data: data.map(row => Object.values(row)),
      search: true,
      sort: true,
      pagination: { limit: 20 }
    }).render(document.getElementById('grid-wrapper'));
  })
  .catch(error => console.error('Error:', error));
</script>
```

3. Replace `YOUR-SUBDOMAIN` with your actual worker URL
4. Publish your site

### Option B: Using Webflow Custom Code (Site-wide)

1. Go to **Project Settings > Custom Code**
2. Add this to **Footer Code**:

```html
<link href="https://cdn.jsdelivr.net/npm/gridjs/dist/theme/mermaid.min.css" rel="stylesheet" />
<script src="https://cdn.jsdelivr.net/npm/gridjs/dist/gridjs.umd.js"></script>

<script>
document.addEventListener('DOMContentLoaded', function() {
  const gridContainer = document.getElementById('grist-data-grid');
  if (!gridContainer) return;

  const WORKER_URL = 'https://grist-csv-downloader.YOUR-SUBDOMAIN.workers.dev';

  fetch(WORKER_URL)
    .then(response => response.json())
    .then(data => {
      new gridjs.Grid({
        columns: Object.keys(data[0] || {}),
        data: data.map(row => Object.values(row)),
        search: true,
        sort: true,
        pagination: { limit: 20 }
      }).render(gridContainer);
    })
    .catch(error => console.error('Error:', error));
});
</script>
```

3. In your Webflow page, add a **Div Block** and give it the ID: `grist-data-grid`
4. Publish your site

## Customization

### Change cache duration
In `src/index.js` line 27, adjust `CACHE_DURATION` (in seconds):
```javascript
const CACHE_DURATION = 300; // 5 minutes
```

### Customize grid appearance
Modify the Grid.js options:
```javascript
new gridjs.Grid({
  columns: ['Name', 'Email', 'Status'], // Specific columns
  search: {
    enabled: true,
    placeholder: 'Search records...'
  },
  pagination: {
    enabled: true,
    limit: 10,
    summary: true
  },
  sort: true,
  resizable: true,
  className: {
    table: 'my-custom-table'
  }
})
```

### Styling
Add custom CSS in Webflow or in the embed:
```css
<style>
.gridjs-wrapper {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.gridjs-table {
  font-family: 'Your Webflow Font';
}
</style>
```

## Troubleshooting

- **CORS errors**: The worker includes `Access-Control-Allow-Origin: *` headers
- **No data showing**: Check browser console for errors
- **Old data showing**: Wait 5 minutes for cache to refresh, or clear browser cache
- **Grist API errors**: Check that your API key has access to the document
