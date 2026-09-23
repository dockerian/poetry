/*
 * album-data.js | dependence: album-const.js
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
  get length() {
    return this.data.length;
  }
  // Get album loaded ratio
  get ratio() {
    return this.data._countRatio;
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
    // console.debug(`Result: `, this.data);
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
          // console.debug(this);
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

// Build up data lookup
function buildLookup () {
  for (const poem of mulu) {
    let files = [];
    let regex = new RegExp(poem.dataFile);
    for (const fileName of defaultImages) {
      let found = fileName == poem.dataFile ||
          regex.test(fileName);
      if (found) {
        dataLookup[fileName] = poem;
        files.push(fileName);
      }
    }
    poem.files = files;
  }
  console.debug(`Data lookup and mulu is ready.`, mulu);
}

// Calculate album ratio state per default settings
function calculateState() {
  let state = 'poor';
  let count = album.countLoaded;
  if (count == album.length) {
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
  let path = srcUrl.substring(0, srcUrl.lastIndexOf('/'));
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

  await setDatumTags(datumn);

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

async function getExifDatetime(dataTags) {
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

// Set deferred tags to album datum
async function setDatumTags(datum) {
  let chkExit = datum == 'undefined' ||
    !(datum && datum.file instanceof File);
  if (chkExit || !datum.file) return;

  let file = datum.file;

  if (typeof EXIF != 'undefined') {
    let exifTags = await getExifTagsAsync(file);
    let sDate = await getExifDatetime(exifTags);
    if (sDate) {
      datum.dateCaptured = sDate;
      datum.tags = exifTags;
    }
    // parsed but no metadata
    datum.parsed = true;
    return;
  }
  // For ExifReader module
  if (typeof ExifReader == 'undefined') {
    console.warn(`ExifReader is undefined.`);
    return;
  }
  try {
    let parsedTags = await ExifReader.load(file);
    if (parsedTags && parsedTags['DateTime'] &&
        parsedTags['DateTime'].description) {
      // Normalizes EXIF format date string variations ("YYYY:MM:DD HH:MM:SS") to standard Date engine elements
      const structuredSegments = parsedTags['DateTime'].description.split(/[: ]/);
      if (structuredSegments.length >= 6) {
        datum.dateCaptured = new Date(
          structuredSegments[0],
          structuredSegments[1] - 1, // standard 0-indexed month array adjustment
          structuredSegments[2],
          structuredSegments[3],
          structuredSegments[4],
          structuredSegments[5]
        );
      }
      datum.tags = parsedTags;
      datum.parsed = true;
    }
  } catch (metadataProcessingFailure) {
    console.warn(`EXIF properties extraction omitted on ${file.name}:`, metadataProcessingFailure);
  }
}
