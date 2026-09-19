/*
 * common.js
**/

class Mutex {
  constructor() {
    this._mutex = Promise.resolve();
  }

  async acquire() {
    let release;
    const nextLock = new Promise((resolve) => {
      release = resolve;
    });
    const prevLock = this._mutex;
    this._mutex = prevLock.then(() => nextLock);
    await prevLock;
    return release;
  }
}

/* Amap service URL getter */
const amapUri = 'https://uri.amap.com';
const amapUrl = (lat, lng) => {
  return `${amapUri}/marker?position=${lng},${lat}`;
};
/* Baidu map service URL getter */
const baiduMapUri = 'https://api.map.baidu.com';
const baiduMapUrl = (lat, lng) => {
  let marker = 'marker?location=';
  let output = 'output=html'; // must have
  return `${baiduMapUri}/${marker}${lat},${lng}&${output}`;
};
/* Google map service URL getter */
const googleMapSearch = 'https://google.com/maps/search/';
const googleMapSite = 'https://maps.google.com';
const googleMapUrl = (lat, lng) => {
  let url = `${googleMapSite}/?q=${lat},${lng}` ||
    // or using the original standard Google Maps API
    `${googleMapSearch}?api=1&query=${lat},${lng}`;
  return url;
};

const mapServices = [{
  name: 'Google Map', getFunc: googleMapUrl
}, {
  name: 'Baidu Map｜百度地图', getFunc: baiduMapUrl
}, {
  name: 'Amap｜高德地图', getFunc: amapUrl
}];


/* Global variables */
let openLinkhref = null;
let openMapshref = null;


const clearClassList = (elem) => {
  if (elem && elem instanceof Element
    && elem.classList instanceof DOMTokenList) {
    elem.classList.remove(...elem.classList);
  }
};

/* Functions using utf8-regex.js */
function convertUtf8(rawString) {
  return decodeURIComponent(escape(rawString));
}
function decodeBytes(asciiString) {
  const bytes = Uint8Array.from(asciiString, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

const getFileName = (path) => path.split(/[\\/]/).pop();

const getStyles = (element, all = false) => {
  let dict = {};
  if (element instanceof Element) {
    // create a clean dummy element of the same tag type to
    // capture browser defaults; should be removed later.
    const dummy = document.createElement(element.tagName);
    document.body.appendChild(dummy);

    const defaultStyles = window.getComputedStyle(dummy);
    const elementStyles = window.getComputedStyle(element);

    for (const key of elementStyles) {
      const eleValue = elementStyles.getPropertyValue(key);
      const defValue = defaultStyles.getPropertyValue(key);
      if (eleValue != null) {
        if (all || eleValue != defValue) {
          // console.debug(`${key}: ${eleValue}`);
          dict[key] = eleValue;
        }
      }
    }
    // clean up the dummy element from the DOM
    document.body.removeChild(dummy);

    return dict;
  }
  return null;
};

const getInteger = function callerFunc(v, defaultValue = 0) {
  if (v === null || v === undefined ||
    typeof v === 'boolean' || typeof v === 'object') {
    // Alternative to using `arguments.callee` since it is
    // deprecated and strictly forbidden in JavaScript's
    // strict mode (`"use strict";`).
    return callerFunc(defaultValue|0);
  }
  if (Number.isInteger(v)) return v;

  const parsed = Math.round(Number(v)); // or Math.trunc
  const result = isNaN(parsed) ?
    callerFunc(defaultValue) : parsed;
  return result;
};

function getIntegerByRange(v, minV, maxV) {
  let value = getInteger(v);
  let v_max = getInteger(maxV);
  let v_min = getInteger(minV);

  if (value >= v_min && value < v_max) return value;
  if (value >= v_max) return v_max;

  return v_min;
}

function hasDictionaryData (v) {
  return v && Object.keys(v).length > 0;
}

function isDecimal(v) {
  return typeof v === 'number' && !Number.isNaN(v)
    && !Number.isInteger(v);
}

function isDictionary(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
}

const isDictionaryEmpty = (obj) => {
  return obj && Object.keys(obj).length === 0
    && obj.constructor === Object;
};

function isWindowObject(v) {
  return (v != null && typeof v === 'object'
    && 'closed' in v && v.window === v);
}

// Open window to the same target
function onClickOpen(event) {
  // Prevent default browser navigation to stop it from opening twice
  event.preventDefault();
  // Safely capture element that holds the onClick attribute
  const aElement = event.currentTarget;
  // Extract the target and href properties
  const targetName = aElement.target;
  const url = aElement.href;

  openUrl(url, targetName);
}

function openUrl(hrefUrl, targetName) {
  let url = hrefUrl ?? baseSite;
  let refName = targetName ?? defaultOpenTarget;
  let ref;
  // Open the URL in the matching named window or tab
  console.log(`Opening [${refName}] ${url}`);

  let hasHref = openLinkhref !== undefined &&
    isWindowObject(openLinkhref);
  let newHref = openLinkhref === null ||
      openLinkhref === undefined || (
      isWindowObject(openLinkhref) &&
      openLinkhref.closed);

  if (newHref) {
    // set a new Windows object
    openLinkhref = window.open(
    url, refName, "noopener=false");
    // console.debug(`Created new:`, openLinkhref);
  } else if (hasHref && !openLinkhref.closed) {
    // console.debug(`Redo window:`, openLinkhref);
    // reuse the closed Windows object
    openLinkhref.location.href = url;
    openLinkhref.focus();
  } else {
    // console.debug(`Open window: ${refName} (${url})`);
    ref = window.open(url, refName, "noopener=false");
    return ref;
  }
  return openLinkhref;
}

// Handle keydown Enter or Space to click
function onKeydownEnterOrSpace(event) {
  if (event instanceof Event) {
    let spaceDn = event.code === 'Space' || event.key === ' ';
    if (spaceDn || event.key === 'Enter') {
      if (spaceDn) {
        // Stop space from scrolling the page
        event.preventDefault();
      }
      return true;
    }
  }
  return false;
}
function onKeydownButton(event, button, actionButton) {
  if (event instanceof Event && button instanceof Element) {
    if (actionButton == null) { // including undefined
      actionButton = button;
    }
    let onKeyEnterOrSpace = onKeydownEnterOrSpace(event);
    if (onKeyEnterOrSpace) {
      // Visually simulate the active state for keyboard users
      button.classList.add('is-pressed');
      // Trigger the click event
      actionButton.click();
    }
  }
}

// GPS location [latitude, longitude] to map services data
const toGPSServices = (gpsLoc) => {
  let svcData = [];
  if (gpsLoc && gpsLoc.length == 2 &&
    isDecimal(gpsLoc[0]) && isDecimal(gpsLoc[1])) {
    for (const svc of mapServices) {
      let u = svc.getFunc(gpsLoc[0], gpsLoc[1]);
      let o = {
        name: svc.name,
        gpsLoc: gpsLoc.join(),
        url: u
      };
      svcData.push(o);
    }
  }
  return svcData;
};

// GPS metadata tags to [latitude, longtitude] array
const toGPSLocation = (gpsDict) => {
  if (!isDictionary(gpsDict)) return [];

  const gpsLoc = [0, 0];
  const keys = Object.keys(gpsDict);

  let gpsLatitNorth = true; // LatitudeRef is N
  let gpsLongitEast = true; // LongitudeRef is E

  // console.debug(`GPS data:`, gpsDict);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const val = gpsDict[key];
    if (key == "GPSLatitude") {
      gpsLoc[0] = toGPSDecimal(val);
      continue;
    }
    if (key == "GPSLatitudeRef") {
      gpsLatitNorth = val === 'N' ? true : false;
      // console.debug(`GPSLatitudeRef: ${val}`);
      continue;
    }
    if (key == "GPSLongitude") {
      gpsLoc[1] = toGPSDecimal(val);
      continue;
    }
    if (key == "GPSLongitudeRef") {
      // console.debug(`GPSLongitudeRef: ${val}`);
      gpsLongitEast = val === 'E' ? true : false;
      continue;
    }
  }
  if (gpsLoc[0] && !gpsLatitNorth) {
    gpsLoc[0] = -1 * gpsLoc[0];
  }
  if (gpsLoc[1] && !gpsLongitEast) {
    gpsLoc[1] = -1 * gpsLoc[1];
  }
  // console.debug(`GPS Location: `, gpsLoc);
  if (gpsLoc[0] && gpsLoc[1]) return gpsLoc;

  return [];
};

// GPS Numbers (array) to decimal
const toGPSDecimal = (gpsNumbers) => {
  if (gpsNumbers instanceof Array) {
    const d = gpsNumbers[0];
    const m = gpsNumbers[1];
    const s = gpsNumbers[2];
    if ([d, m, s].every(v => v instanceof Number)) {
      const degrees = d.numerator / d.denominator;
      const minutes = m.numerator / m.denominator;
      const seconds = s.numerator / s.denominator;
      const decimal = degrees + (minutes / 60) + (seconds / 3600);
      return Number(decimal.toFixed(6));
    }
  }
  return '';
};

// Date to ISO string
const toISOString = (oDate) => {
  if (oDate instanceof Date) {
    return oDate.toISOString()
      .replace('T', ' ')
      .substring(0, 16);
  }
  return "N/A";
};
