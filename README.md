# MRT Arrival

A web application that displays real-time Singapore MRT train arrival times. Get instant access to train departure information for any MRT station.

## Features

- **Real-time Arrivals** - Live train arrival times with automatic 30-second refresh
- **All MRT Lines** - Support for EWL, NSL, CCL, NEL, DTL, and TEL (108 stations)
- **Quick Access** - Preset buttons for frequently used stations
- **Station Search** - Searchable dropdown to find any station
- **Dark/Light Theme** - Toggle with persistence via localStorage
- **Responsive Design** - Optimized for mobile, tablet, and desktop

## Tech Stack

- **Frontend**: Preact + HTM (template literals)
- **Backend**: Netlify Functions (serverless)
- **Data**: Web scraping via Cheerio + Axios
- **Hosting**: Netlify

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:8888`.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/arrivals?code=STATION_CODE` | Get arrival times for a station |
| `GET /api/stations` | Get list of all MRT stations |
| `GET /health` | Health check |

### Example Response

```json
{
  "stationName": "Tiong Bahru",
  "lines": ["EW17"],
  "arrivals": [
    {
      "destination": "Pasir Ris",
      "nextTrain": "2 min",
      "subsequentTrain": "8 min"
    },
    {
      "destination": "Tuas Link",
      "nextTrain": "5 min",
      "subsequentTrain": "12 min"
    }
  ]
}
```

## Project Structure

```
mrt-arrival/
├── netlify/
│   └── functions/
│       ├── arrivals.js    # Fetch arrival times
│       ├── stations.js    # Station list
│       └── health.js      # Health check
├── public/
│   └── index.html         # Frontend SPA
├── netlify.toml           # Netlify config
└── package.json
```

## Deployment

The app is configured for Netlify. Push to your connected repository or deploy manually:

```bash
npx netlify deploy --prod
```

## Data Source

Arrival times are scraped from SMRT's official train arrival web service.

## License

MIT
