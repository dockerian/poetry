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
