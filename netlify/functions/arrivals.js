const axios = require('axios');
const cheerio = require('cheerio');

const TARGET_URL = 'https://trainarrivalweb.smrt.com.sg/';

const DEFAULT_HEADERS = {
  'Accept': '*/*',
  'Accept-Language': 'en,en-US;q=0.9',
  'Cache-Control': 'no-cache',
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'DNT': '1',
  'Origin': 'https://trainarrivalweb.smrt.com.sg',
  'Pragma': 'no-cache',
  'Referer': 'https://trainarrivalweb.smrt.com.sg/',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  'X-MicrosoftAjax': 'Delta=true',
  'X-Requested-With': 'XMLHttpRequest',
};

async function fetchPage(options) {
  const { url, method = 'GET', headers = {}, body = null } = options;

  const config = {
    method,
    url,
    headers,
    timeout: 30000,
  };

  if (body) {
    config.data = body;
  }

  const response = await axios(config);
  return response.data;
}

async function getInitialPage() {
  const responseData = await fetchPage({
    url: TARGET_URL,
    method: 'GET',
    headers: {
      'User-Agent': DEFAULT_HEADERS['User-Agent'],
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  const $ = cheerio.load(responseData);

  const viewState = $('#__VIEWSTATE').val();
  const viewStateGenerator = $('#__VIEWSTATEGENERATOR').val();
  const eventValidation = $('#__EVENTVALIDATION').val();

  return { viewState, viewStateGenerator, eventValidation };
}

async function getArrivalTime(stationCode, pageState) {
  const formData = new URLSearchParams({
    'ScriptManager1': 'UP1|ddlStation',
    'stnCode': '',
    'stnName': '',
    'ddlStation': stationCode,
    '__EVENTTARGET': 'ddlStation',
    '__EVENTARGUMENT': '',
    '__LASTFOCUS': '',
    '__VIEWSTATE': pageState.viewState,
    '__VIEWSTATEGENERATOR': pageState.viewStateGenerator || 'CA0B0334',
    '__VIEWSTATEENCRYPTED': '',
    '__ASYNCPOST': 'true',
  });

  if (pageState.eventValidation) {
    formData.append('__EVENTVALIDATION', pageState.eventValidation);
  }

  const responseData = await fetchPage({
    url: TARGET_URL,
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: formData.toString(),
  });

  return parseArrivalResponse(responseData);
}

function parseArrivalResponse(responseData) {
  const parts = responseData.split('|');

  let htmlContent = '';
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === 'updatePanel' && parts[i + 1] === 'UP1') {
      htmlContent = parts[i + 2] || '';
      break;
    }
  }

  const $ = cheerio.load(htmlContent || responseData);

  const stationName = $('p.boldTxt b').first().text().trim();

  const lineNamePattern = /^(.*Line.*\([A-Z]+\))$/;

  const directions = [];
  let currentLineName = '';

  $('span[style*="display:inline-block"]').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    const style = $el.attr('style') || '';

    if (style.includes('font-size:Large') && style.includes('font-weight:bold')) {
      const lineMatch = text.match(lineNamePattern);
      if (lineMatch) {
        currentLineName = lineMatch[1];
      }
    }

    const directionMatch = text.match(/in the direction of (.+)/i);
    if (directionMatch && currentLineName) {
      directions.push({
        lineName: currentLineName,
        towards: directionMatch[1].trim(),
        nextTrain: null,
        subsequentTrain: null,
      });
    }
  });

  $('table#gvTime').each((idx, table) => {
    const rows = $(table).find('tr');
    if (rows.length >= 3 && directions[idx]) {
      const timeCells = $(rows[1]).find('td');
      const destCells = $(rows[2]).find('td');

      directions[idx].nextTrain = {
        time: $(timeCells[0]).text().trim(),
        destination: $(destCells[0]).text().trim(),
      };
      directions[idx].subsequentTrain = {
        time: $(timeCells[1]).text().trim(),
        destination: $(destCells[1]).text().trim(),
      };
    }
  });

  return { stationName, directions };
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Get station code from query parameters or path
  let stationCode = event.queryStringParameters?.code;

  // If not in query params, try to extract from path (e.g., /api/arrivals/RFP)
  if (!stationCode && event.path) {
    const pathMatch = event.path.match(/\/(?:api\/)?arrivals\/([A-Za-z]+)$/);
    if (pathMatch) {
      stationCode = pathMatch[1];
    }
  }

  // Default to TIB if no station code provided
  if (!stationCode) {
    stationCode = 'TIB';
  }

  try {
    const pageState = await getInitialPage();
    const arrivalData = await getArrivalTime(stationCode.toUpperCase(), pageState);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          station: arrivalData.stationName,
          directions: arrivalData.directions,
        },
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
