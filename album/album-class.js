/*
 * album-class.js
 * - dependence:
 *   * album-const.js
 *   * album-data.js
 * © 2026 Jason Zhu | Dockerian.
**/

/**
 *  class Album
 *  * album.data item structure:
 *    - name: image filename
 *    - dateCaptured: datetimeStamp from File or EXIF metadata
 *    - file: File object
 *    - parsedTags: boolean flag if tags being processed
 *    - path: image path (N/A for local file)
 *    - srcUrl: image full path to filename
 *    - tags: EXIF info dictionary
**/
class Album {
  // Constructor
  constructor() {
    this._countFiles = 0;
    this._countRatio = 0;
    this._mutex = new Mutex();
    this.data = [];
  }

  // Get count of loaded files in image data
  get countLoaded() {
    return this._countFiles;
  }
  // Check if all image files have been loaded
  get isFullyLoaded() {
    return this._countFiles == this.data.length;
  }
  // Get data length
  get ratio() {
    return this.data._countRatio;
  }
  // Get data length / size
  get size() {
    return this.data.length;
  }

  // Add (push) new datum to album data
  addItem(item) {
    if (item) {
      this.data.push(item);
    }
  }

  // Clear album data and counters
  clearData() {
    this._countFiles = 0;
    this._countRatio = 0;
    this.data.length = 0;
  }

  // Get from default static images list
  async getDefaultData(deferredTags = false) {
    this.clearData();
    for (const s of defaultImages) {
      const result = await getDatum(s, deferredTags);
      if (result) {
        this.data.push(result);
        // sync with this._countFiles
        if (result.file && !this.isFullyLoaded) {
          this._countRatio = ++this._countFiles / this.data.length;
        }
      }
    }
    console.debug(`getDefaultData result: `, this.data);
    return this.data;
  }

  // Intercepts property requests on accesses to instance.items.
  get items() {
    const self = this;
    return new Proxy(this.data, {
      get(target, prop) {
        // Allow array index access (e.g., store.items[0])
        if (typeof prop === 'string' && !isNaN(prop)) {
          return target[Number(prop)];
        }
        // Allow standard array properties like .length
        if (prop in target) {
          const value = target[prop];
          return typeof value === 'function' ? value.bind(target) : value;
        }
        return undefined;
      },
      set() {
        throw new Error('Data is read-only via index accessor');
      }
    });
  }

  // Get item at index
  getItem(index) {
    if (index < 0 || index > this.data.length) return null;
    return this.data[index];
  }

  // Load from default images with deferred files and tags
  async loadAlbum(deferredTags = false) {
    await this.getDefaultData(
      defaultImages, this.data, deferredTags);
    console.info(`Loaded album: `, this.data);
  }

  // Load album data from a verified list
  loadFromList(aList) {
    if (Array.isArray(aList) && aList.length > 0) {
      this.data.length = 0;
      this.data.push(...aList);
      this._countFiles = this.data.length;
      this._countRatio = 1;
    }
  }

  // Core Filtering / Sorting Engine algorithm
  sortByDate() {
    this.data.sort((alpha, beta) => {
      if (!alpha.dateCaptured) return -1;
      if (!beta.dateCaptured) return 1;
      // Chronological ascending arrangement configuration
      return alpha.dateCaptured - beta.dateCaptured;
    });
  }

  // Update item at index
  async updateItem(index) {
    if (index < 0 || index > this.data.length) return false;
    let activeItem = this.data[index];
    let deferredFile = activeItem.file == null;

    if (this.isFullyLoaded || !deferredFile) {
      return true;
    }

    const release = await this._mutex.acquire();
    let retStatus = false;

    try {
      // Critical section: safe to read/write data
      let datum = await getDatumDeferred(activeItem);
      if (datum && datum.file) {
        if (deferredFile) {
          // console.info("Updated datum:", datum);
          if (!this.isFullyLoaded) {
            this._countRatio = ++this._countFiles / this.data.length;
          }
        }
        if (deferredFile && this.isFullyLoaded) {
          let msg = `Album is fully loaded with [${this.countLoaded}] images`;
          console.debug(this);
          console.debug(msg);
        }
        retStatus = true;
      }
    } finally {
      // Always release the lock, even if on errors
      release();
    }
    return retStatus;
  }
} // class Album

// Global class Album instance
const album = new Album();
const exifByClass = typeof EXIF == 'undefined';
const exifReader = typeof ExifReader == 'undefined';

// Build up data lookup
function buildLookup() {
  console.debug(`Build dataLookup from mulu:`, mulu, muluLyrics);
  // CAUTION: after spread-merging the list, one should
  // only use keys in both mulu and muluLyrics
  for (const poem of [...mulu, ...muluLyrics]) {
    let files = [];
    let rFile = poem.dataFile;
    let regex = rFile ? new RegExp(rFile, 'i') : null;
    for (const fileName of defaultImages) {
      let found = fileName == poem.dataFile || (
          rFile ? regex.test(fileName): false);
      if (found) {
        console.debug(`Found ${fileName} matches`, rFile);
        files.push(fileName);
        let namc = fileName.toLowerCase();
        let name = getFilenameWithoutExtension(fileName);
        let keys = getPoemKeys(poem.mulu, poem.pid);
        for (const key of keys) {
          dataLookup.query[key] = poem;
        }
        name = name.toLowerCase();
        dataLookup.names[fileName] = poem;
        dataLookup.query[namc] = poem;
        dataLookup.query[name] = poem;
        console.debug(`Added queries: ${name}, ${namc}, =>`, poem);
        poem.files = files;
      }
    }
  }
  console.info(`Lookup data is ready`, dataLookup);
}

// Calculate album ratio state per default settings
function calculateState() {
  let state = 'poor';
  let count = album.countLoaded;
  if (count == album.size) {
    state = 'done';
  } else if (count > defGoodCount) {
    state = 'good';
  } else if (count > defFairCount) {
    state = 'fair';
  }
  return state;
}

// Get album datum from image URL
async function getDatum(sImage, deferredTags = false) {
  // console.info(`Loading ${sImage}`);
  const url = `${baseURL}/${sImage}`;
  const sDate = (sImage.match(/^(\d{4})(\d\d)(\d\d).+$/)
    || []).slice(1, 4).join('-') || null;
  // console.info(`date string: ${sDate}`);
  const oDate = sImage ? (sDate ?
    new Date(sDate) : null) : null;
  const datum = {
    name: sImage,
    dateCaptured: oDate,
    file: null,
    parsedTags: false,
    path: baseURL,
    srcUrl: url,
    tags: null
  };
  if (deferredTags) return datum;

  await getDatumDeferred(datum);
  return datum;
}

async function getDatumDeferred(datum) {
  if (!datum || !datum.name || !datum.srcUrl) {
    return null;
  }
  let oBlob, reponse;
  let sImage = datum.name;
  let url = datum.srcUrl;
  try {
    response = await fetch(url, cachePolicy);
    oBlob = await response.blob();
    if (!response.ok) {
      console.error(`HTTP status: ${response.status} at ${url}`);
      return null;
    }
  } catch (error) {
    let msg = `Fetch error: ${sImage} \nfrom ${baseURL}\n`;
    console.error(msg, error.message);
    return null;
  }
  datum.file = new File([oBlob], url, { type: oBlob.type });

  await setDatumTags(datum);
  // console.info(`Loaded: ${sImage}, ${datum}`);
  return datum;
}

// Get album datum fron File object
async function getDatumFromFile(file, deferredTags = false) {
  if (!file || !file.type ||
      !file.lastModified || !file.name) {
    return null;
  }
  let datetimeStamp = file.lastModified ?
    new Date(file.lastModified) : null;
  let srcUrl = URL.createObjectURL(file);
  let path = getUrlPath(srcUrl);
  let datum = {
    file: file,
    name: getFileName(file.name),
    dateCaptured: datetimeStamp,
    parsedTags: false,
    path: path,
    srcUrl: srcUrl,
    tags: null
  };

  if (deferredTags) return datum;

  await setDatumTags(datum);

  return datum;
}

// Lightweight Promise wrapper to extract metadata chronologically using exif-js
function getExifTagsAsync(file) {
  return new Promise((resolve) => {
    // Failsafe guard check if cdnjs network request fails
    if (typeof EXIF === 'undefined') {
      resolve(null);
      return;
    }
    // exif-js attaches parsed elements to the file buffer object internally
    EXIF.getData(file, function() {
      // Retrieve a flat dictionary of all discovered tags
      const allTags = EXIF.getAllTags(this);
      resolve(allTags || null);
    });
  });
}

function getExifDatetime(dataTags) {
  if (dataTags) {
    // console.info(`EXIF tags: `, dataTags);
    // exif-js prioritizes 'DateTimeOriginal' (taken) and 'DateTime' (modified)
    const sDate = dataTags.DateTimeOriginal || dataTags.DateTime;

    if (sDate && typeof sDate === 'string') {
      // Standard EXIF strings format: "YYYY:MM:DD HH:MM:SS"
      // Convert colons in the date portion to hyphens so JavaScript can parse it correctly
      const normalizedDateStr = sDate.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
      const parsedDate = new Date(normalizedDateStr);

      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
  }
  return null;
}

function getExifReaderDateTime(exifTags) {
  let oDate = null
  if (exifTags && exifTags['DateTime'] &&
      exifTags['DateTime'].description) {
    // Normalizes EXIF format date string variations ("YYYY:MM:DD HH:MM:SS") to standard Date engine elements
    const structuredSegments = exifTags['DateTime'].description.split(/[: ]/);
    if (structuredSegments.length >= 6) {
      oDate = new Date(
        structuredSegments[0],
        structuredSegments[1] - 1, // standard 0-indexed month array adjustment
        structuredSegments[2],
        structuredSegments[3],
        structuredSegments[4],
        structuredSegments[5]
      );
    }
  }
  return oDate;
}

function getQueryKeyFromUrl() {
  const queryKey = getQueryKey();
  // digits, letters, or dash, without encoded
  const replacer = /%[0-9A-Z]{2}|[^a-zA-Z0-9-]/g;
  const cleanKey = queryKey ? queryKey.replace(replacer, '') : '';
  // only use the 1st hashtag, query value or key
  return cleanKey.toLowerCase();
}

// Set deferred tags to album datum
async function setDatumTags(datum) {
  let chkExit = datum == 'undefined' ||
    !(datum && datum.file instanceof File);
  if (chkExit || !datum.file) return;
  if (!datum.tags) datum.tags = {};

  let file = datum.file;

  if (!datum.dateCaptured) {
    datum.dateCaptured = file.lastModified ? new Date(
      file.lastModified) : file.lastModifiedDate;
  }

  if (typeof EXIF != 'undefined') {
    let exifTags = await getExifTagsAsync(file);
    let sDate = getExifDatetime(exifTags);
    if (sDate) {
      datum.dateCaptured = sDate;
      datum.tags = exifTags;
    }
    // parsed but no metadata
    datum.parsed = true;
    // return;
  }
  // For ExifReader module
  if (typeof ExifReader == 'undefined') {
    console.warn(`ExifReader is undefined.`);
    return;
  }
  try {
    const oTags = await ExifReader.load(file);
    const oDate = getExifReaderDateTime(oTags);
    if (oDate) {
      datum.dateCaptured = oDate;
    }
    for (const key of Object.keys(oTags)) {
      const tag = oTags[key];
      // Each tag contains a description and raw value
      if (datum.tags[key]) {
        console.debug(`EXIF------ [${datum.name}].tags[${key}] =`, datum.tags[key]);
      }
      console.debug(`ExifReader [${datum.name}].tags[${key}] = ${tag.description}`, tag);
      if (tag && !datum.tags[key] && tag.description) {
        datum.tags[key] = tag.description;
      }
    }
    datum.parsed = true;
  } catch (metadataProcessingFailure) {
    console.warn(`EXIF properties extraction omitted on ${file.name}:`, metadataProcessingFailure);
  }

  await setExifTags(datum);
}

// set address info per GPS Reverse Geocoding
async function setExifAddress(datum, checkExist = false) {
  if (!datum || !datum.tags) return;
  if (!datum.exif || datum.exif['address'] && checkExist) {
    console.debug(`Skip overwriting address:`, datum.exif['address']);
    return;
  }

  let addrInfo, addrFromGPS = false;
  let city, state, country, countryCode;
  const hasGPS = datum.gpsData && datum.gpsData.length == 2;
  if (datum.tags['City']) {
    city = datum.tags['City'];
    country = datum.tags['Country'];
    countryCode = datum.tags['CountryCode'];
    state = datum.tags['Province/State'] || datum.tags['State'];
    addrInfo = [city, state, country];
  } else if (hasGPS) {
    let gpsLoc = datum.gpsData;
    let addr = await getGPSAddress(gpsLoc[0], gpsLoc[1]);
    if (addr) {
      addrFromGPS = true; // reverse geocoding indicator
      city = addr.city || addr.town || addr.village || 'Unkown';
      country = addr.country || '';
      countryCode = addr.country_code || '';
      state = addr.state || addr.province || '';
      addrInfo = [city, state, country];
    } else {
      console.debug(`No address info per GPS coordinate`, datum.gpsData);
    }
  } else {
    console.debug(`No address info nor GPS coordinate`, datum);
  }
  if (addrInfo) {
    if (country.startsWith('United States')) {
      countryCode = 'USA';
    }
    const c = addrInfo[2]; // country
    const p = addrInfo[1]; // province or state
    const a = [
      addrInfo[0], // city
      c === 'China' && p.startsWith(addrInfo[0]) ? '' :
        statesLookup(countryCode, p) || p, // province or state
      countryCode === 'USA' ? countryCode : c, // country
    ];
    const s = Array.from(new Set(a));
    const address = s.filter(v => typeof v === "string" && v.trim() !== '').join(", ");
    datum.exif['address'] = (addrFromGPS ? '* ' : '') + address;
    console.debug(`Location: ${address}`, addrInfo, datum);
  }
}

// Set EXIF tags to album datum
async function setExifTags(datum) {
  if (!datum || !datum.tags) return;
  if (!datum.exif) {
    datum.exif = {};
  }
  let gpsTags = {};
  let hasLookupTags = false;
  let hasGPSTags = false;
  for (const [key, tagLabel] of Object.entries(exifKeyLookup)) {
    let tagValue = datum.tags[key];
    if (!tagValue) continue;
    if (key.startsWith('GPS')) {
      hasGPSTags = true;
      gpsTags[key] = tagValue;
      continue;
    }
    let sValue = convertUtf8(tagValue);
    console.debug(`key: ${key}, value: ${sValue}`);
    if (key == 'caption' || key == 'ImageDescription') {
      console.debug(`CAPTION: `, sValue);
      sValue = sValue.split(/[\r\n\-#]/)[0];
      if (sValue.length > maxLength) {
        sValue = sValue.slice(0, maxLength) + '...';
      }
    }
    if (key == 'ExposureTime' && typeof tagValue !== 'string') {
      let sv = Math.round(1 / Number(sValue));
      sValue = `1 / ${sv}`;
    }
    datum.exif[key] = sValue;
    hasLookupTags = true;
  }
  if (!hasLookupTags) {
    console.debug('No lookup key in EXIF tags', exifKeyLookup, datum.tags);
  }
  if (!hasGPSTags) {
    console.debug(`No GPS tags from [${datum.name}] tags:`, datum.tags);
  }

  let gpsData = toGPSLocation(gpsTags);
  if (Array.isArray(gpsData) && gpsData.length === 2) {
    datum.gpsData = gpsData;
  } else {
    console.debug(`No GPS coordinate [${datum.name}] gpsTags:`, gpsTags, datum.tags);
  }

  await setExifAddress(datum);

  return hasLookupTags;
}
