/**
 * album-const.js
 * - dependences: N/A, site-based config
 * © 2026 Jason Zhu | Dockerian.
 **/

const baseLoca = window.location;
console.info(`Base at: `, baseLoca);
const basePage = "shiji.html";
const baseSite = "https://dockerian.github.io/poetry";
const basePath = baseLoca.origin.startsWith("file://") ?
  baseSite + "/album" : baseLoca.href.substring(0,
  baseLoca.href.lastIndexOf('/'));
const baseQuery = getQuery();
const baseUrlParams = new URLSearchParams(baseQuery);
const baseURL = `${basePath}/pics`;

// default target name for window.open
const defaultOpenTarget = "page";

/*
 * cachePolicy on fetch() call network request
 * - default: The browser uses standard caching rules.
 * - force-cache: The browser uses a cached response if it exists, even if it is stale, without checking the server.
 * - no-cache: The browser checks with the server to validate the cache before using it.
 * - only-if-cached: The browser uses the cache only and never makes a network request. (Note: This requires mode: 'same-origin').
 */
const cachePolicy = {
  catch: 'default'
}

const awaitImage = 'images/awaiting-cycle.gif';
const danceImage = 'images/awaiting-dance.gif';
const coverImage = 'images/poetry-blue.png';
const errorImage = 'images/error-orange.png';
const emptyImage = 'images/empty-data.png';

const decoder = new TextDecoder('utf-8');

// EXIF metadata tags lookup
const exifKeyLookup = {
  'headline': 'Subject',
  'caption': 'Description',
  'Copyright': 'Copyright',
  'Artist': 'Author',
  'Make': 'Camera Brand',
  'Model': 'Model Designator',
  'FNumber': 'Aperture Metric',
  'ExposureTime': 'Shutter Speed',
  'FocalLength': 'Lens System Focal',
  'ISOSpeedRatings': 'ISO Value',
  'GPSLatitude': 'Latitude',
  'GPSLatitudeRef': 'Latitude Direction',
  'GPSLongitude': 'Longitude',
  'GPSLongitudeRef': 'Longitude Direction',
  'Software': 'Editor'
};

const formatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false // Forces 24-hour clock
});

const maxLength = 60; // for caption/description

const onMobileDevice = navigator && navigator.userAgentData && navigator.userAgentData.mobile;

// country code (3-letter uppper case): province/state abbreviation map
const states = {
  'USA' : {
    'AK' : 'Alaska',
    'AL' : 'Alabama',
    'AR' : 'Arkansas',
    'AS' : 'American Samoa',
    'AZ' : 'Arizona',
    'CA' : 'California',
    'CO' : 'Colorado',
    'CT' : 'Connecticut',
    'DC' : 'District of Columbia',
    'DE' : 'Delaware',
    'FL' : 'Florida',
    'GA' : 'Georgia',
    'GU' : 'Guam',
    'HI' : 'Hawaii',
    'IA' : 'Iowa',
    'ID' : 'Idaho',
    'IL' : 'Illinois',
    'IN' : 'Indiana',
    'KS' : 'Kansas',
    'KY' : 'Kentucky',
    'LA' : 'Louisiana',
    'MA' : 'Massachusetts',
    'MD' : 'Maryland',
    'ME' : 'Maine',
    'MI' : 'Michigan',
    'MN' : 'Minnesota',
    'MO' : 'Missouri',
    'MP' : 'Northern Mariana Islands',
    'MS' : 'Mississippi',
    'MT' : 'Montana',
    'NC' : 'North Carolina',
    'ND' : 'North Dakota',
    'NE' : 'Nebraska',
    'NH' : 'New Hampshire',
    'NJ' : 'New Jersey',
    'NM' : 'New Mexico',
    'NV' : 'Nevada',
    'NY' : 'New York',
    'OH' : 'Ohio',
    'OK' : 'Oklahoma',
    'OR' : 'Oregon',
    'PA' : 'Pennsylvania',
    'PR' : 'Puerto Rico',
    'RI' : 'Rhode Island',
    'SC' : 'South Carolina',
    'SD' : 'South Dakota',
    'TN' : 'Tennessee',
    'TT' : 'Trust Territories',
    'TX' : 'Texas',
    'UT' : 'Utah',
    'VA' : 'Virginia',
    'VI' : 'Virgin Islands',
    'VT' : 'Vermont',
    'WA' : 'Washington',
    'WI' : 'Wisconsin',
    'WV' : 'West Virginia',
    'WY' : 'Wyoming',
  },
};

const usaStatesLookup = Object.fromEntries(
  Object.entries(states['USA']).map(([a, s]) => [s, a]));

const statesLookup = (countryCode, state) => {
  if (typeof countryCode !== 'string') return '';
  if (typeof state !== 'string') return '';

  const usa = ['US', 'USA', 'United States', 'United States of America'];
  if (usa.some(v => v.toUpperCase() == countryCode.toUpperCase())) {
    return usaStatesLookup[state] || '';
  }
  if (states[countryCode]) {
    const sdict = states[countryCode.toUpperCase()];
    const vdict = Object.fromEntries(Object.entries(
      sdict).map(([a, s]) => [s, a]));
    return vdict[state] || '';
  }
  return '';
};
