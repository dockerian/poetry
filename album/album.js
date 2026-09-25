/*
 * album.js
 * - dependences:
 *   * cdn*.js, and common.js
 *   * gasture.js
 *   * album-*.js
 * © 2026 Jason Zhu | Dockerian.
 */

// Set global debugging level
bindConsoleLogFunctions(DEBUG_LEVELS.INFO);
// Customize test data size
const albumTestSize = DEBUG_LEVELS.DEBUG * 1;
if (CURRENT_LOG_LEVEL >= DEBUG_LEVELS.DEBUG) {
  defaultImages.splice(albumTestSize);
}

// async update mutex
const asyncMutex = new Mutex();
// page size on navigation
const pageSize = defaultPageSize();
// seconds of animation duration
const secAnimation = 3;
// slideshow mutex locker
const slideshowMutex = new Mutex();
// slideshow intervals
const slideshowState = {
  _min: 1,
  _max: 9,
  _default: 1,
  _direction: 1,
  get default() { return this._default; },
  get max() { return this._max; },
  get min() { return this._min; },
  get next() { return this._direction > 1; },
  get prev() { return this._direction < 1; },
  get startName() { return 'Start Slideshow'; },
  get stopName() { return 'Stop Slideshow'; },
  browsePrev() { this._direction = -1; },
  browseNext() { this._direction = 1; },
  cycling(v) {
    let num = getIntegerByRange(v,
      this._min, this._max, this._default);
    console.debug(`slideshowState: num = ${num}, v = ${v}, `
      + `min = ${this._min}, max = ${this._max}, `
      + `default = ${this._default}`);
    if (num == 0) return this._default;
    if (num > this._max) return this._min;
    if (num < this._min) return this._max;
    return num;
  }
};
// touch state object for touch events
const touchState = new Gesture();

/*****************************
* Album state setting
*****************************/
let currentIndex = 0;
let currentEnabled = false;
let currentState = '';
let disabledView = false;
let asyncUpdate = false;
let asyncCycled = false;
let controlFadeTimeout = null;
let slideshowTimer = null;
let clearZone = false;
let showLocal = false;
let onRefresh = false;

// DOM nodes references
const boxImage = document.getElementById('boxImage');
const btnOpenP = document.getElementById('btnOpenP');
const curImage = document.getElementById('curImage');
const divCover = document.getElementById('divCover');
const exifInfo = document.getElementById('exifInfo');
const btnFiles = document.getElementById('btnFiles');
const hidFiles = document.getElementById('hidFiles');
const btnFresh = document.getElementById('btnFresh');
const divSlide = document.getElementById('divSlide');
const btnSlide = document.getElementById('btnSlide');
const elemIntv = document.getElementById('numInput');
const btnPrevP = document.getElementById('btnPrevP');
const btnNextP = document.getElementById('btnNextP');
const clikZone = document.getElementById('clikZone');
const divAwait = document.getElementById('divAwait');
const divCount = document.getElementById('divCount');
const digitNum = document.getElementById('digitNum');
const gifExifP = document.getElementById('gifExifP');
const gifFiles = document.getElementById('gifFiles');
const gifStats = document.getElementById('gifStats');
const numFiles = document.getElementById('numFiles');
const numStats = document.getElementById('numStats');

// DOM nodes only used for clearControls()
const bgcPanel = document.getElementById('bgcPanel');
const divPanel = document.getElementById('divPanel');
const pActions = document.getElementById('pActions');

// selective area of class or elements to ignore touch
const selectiveToIgnore = [
  '.ui-overlay',
  '.p-exif',
  '.p-exif-loc',
  '.p-actions',
  '.click-zone',
  '.btn-nav'
];

// controls can be hidden to show clear image
const controls = [
  btnNextP, btnPrevP, divCount, divLinks,
  divPanel, bgcPanel, pActions
];

/*****************************
 * Album functions
 *****************************/

// Function to show the cover with animation duration
function animateCover(seconds = 1) {
  if (!divCover) return;
  let sec = getIntegerByRange(seconds, 1, secAnimation, 1);
  // Reset the animation in case it's already running
  divCover.classList.remove('animate');
  // Force a reflow/repaint so the browser registers the removal
  void divCover.offsetWidth;
  // Set the custom duration when CSS has variable
  // such as `animation: keyFrames var(--duration, 5s);`
  divCover.style.setProperty('--duration', `${sec}s`);
  // Add the class back to start the animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
        divCover.classList.add('animate');
    });
  });
}

function clearAsyncUpdate(clearCycled = false) {
  if (clearCycled) {
    console.debug("Async update: new cycle available.");
    asyncCycled = false;
  }
  asyncUpdate = false;
}

// Show current imaage and toggle others visibility
function clearControls() {
  console.debug(`BEGIN clearZone state = ${clearZone}`);
  for (const elem of controls) {
    console.debug(`:: elem visibility=`, elem.style.visibility, elem);
    elem.style.visibility =
      clearZone ? 'collapse' : 'visible';
  }
  if (clearZone) {
    clearZone = false;
  } else {
    clearZone = true;
  }
  console.debug(`END:: clearZone state = ${clearZone}`);
}

// Fuctions to disable/enable current image and view
function disableImage(errImageSrc) {
  btnOpenP.style.opacity = 0;
  clikZone.classList.add('disabled');
  curImage.classList.add('disabled');
  curImage.src = errImageSrc ?? danceImage;
  currentEnabled = false;
}

function disableViews() {
  disabledView = true;

  btnOpenP.style.opacity = 0;
  btnSlide.setAttribute('aria-disabled', true);
  btnSlide.innerText = "No Slideshow";
  divSlide.style.pointerEvents = 'none';
  divSlide.style.opacity = 0.25;
  divCount.classList.remove('ready');
  curImage.src = emptyImage; // from const.js
  curImage.alt = "No usable images processed";
  exifInfo.innerText = "No image data loaded";
  clikZone.innerText = "Empty album";
  clikZone.title = "No album image";
}

function enableCount() {
  // displaying count of album items
  let spanClass = 'okay';
  if (showLocal) {
    let count = album.size;
    divCount.title = `${count} local images`;
    numStats.style.display = 'none';
    numFiles.style.display = 'inline'
    numFiles.innerText = `${count}`;
  } else {
    spanClass = calculateState();
    let ratio = `${album.countLoaded} / ${defaultCount}`;
    divCount.title = `${ratio} :: ${spanClass}`;
    numFiles.style.display = 'none';
    numStats.style.display = 'inline';
    numStats.innerText = `${album.size}`;
    numStats.opacity = 1;
    clearClassList(digitNum);
    digitNum.classList.add(spanClass);
    divCount.classList.add('ready');
  }
  console.debug(`#digitNum class: ${digitNum.className}`);
  currentState = spanClass;
}

function enableImage() {
  const data = album.data[currentIndex];
  btnOpenP.style.opacity = 1;
  btnOpenP.style.display = 'inline-block';
  clikZone.classList.toggle('active');
  curImage.classList.remove('disabled');
  curImage.src = data ? data.srcUrl : '';
  currentEnabled = true;
}

function enableSlideshow() {
  btnSlide.innerText = slideshowState.startName;
  btnSlide.setAttribute('aria-disabled', false);
  divSlide.style.pointerEvents = 'auto';
  elemIntv.disabled = false;
}

function enableViews(onInit = false) {
  disabledView = false;

  btnOpenP.classList.remove('disabled');
  clikZone.title = "See Image Info panel";
  clikZone.innerText = '';

  enableCount();
  const seqNum = currentIndex + 1;
  const atLastSequm = seqNum == album.size;
  if (onInit) {
    enableSlideshow();
  } else { // on navigation steps
    digitNum.classList.add('step');
    digitNum.innerText = `${seqNum}`;
  }
  const message = 'Album enabled';
  if (!onInit) {
    console.debug(message);
  } else {
    console.info(message);
  }
}

// Function to wake up and hold navigation visibility values
// on mobile interactions - highlight navigation layout buttons
// and for user confirmation
function flashMobileControls() {
  // Clear any pending fade timer
  if (controlFadeTimeout) clearTimeout(controlFadeTimeout);

  // Force navigation controls to peak solid visibility
  btnPrevP.classList.add('force-visible');
  btnNextP.classList.add('force-visible');

  // Schedule graceful visibility drop after 2.5 seconds of touchscreen rest
  controlFadeTimeout = setTimeout(() => {
    btnPrevP.classList.remove('force-visible');
    btnNextP.classList.remove('force-visible');
  }, 2500);
}

// Load local image files from open dialog
async function loadFiles(event) {
  showAwait();
  clearAsyncUpdate(true);
  console.debug("On input file event change:", event);
  const rawFiles = Array.from(event.target.files);
  if (rawFiles.length === 0) return;
  console.info(`Local files:`, rawFiles);

  quitSlideshow();
  exifInfo.innerHTML = `
    Filtering & parsing items chronologically
    <br/>...<br/>
    This may take a while
    <br/>...`;

  const verifiedTempList = [];
  console.info("Checking local files ...");

  for (const file of rawFiles) {
    // Filtering layer requirement: Exclude items failing typical type validation specs
    if (!file.type.startsWith('image/')) continue;

    // Get album datum from file, with deferred tags
    let data = await getDatumFromFile(file, true);

    verifiedTempList.push(data);
  }

  hideAwait();

  if (verifiedTempList.length > 0) {
    showLocal = true;
    currentIndex = 0;
    album.loadFromList(verifiedTempList);
    const msg = `Loaded from ${album.size} images`
    console.info(msg, album.data);
    await updateView();
  } else {
    exifInfo.innerHTML = `
      Processing Error:<br/>No valid image loaded`;
    disableViews();
  }
}

// Pagination increments looping boundary indices
async function navigate(num, onSlideshow = false) {
  if (album.size === 0) {
    console.debug(`Album size = 0 at navigate`, album);
    disableViews();
    return;
  }
  if (!onSlideshow) {
    quitSlideshow();
  }
  const size = album.size;
  const step = isNumber(num) ? num : 0;
  if (step > 0) {
    slideshowState.browseNext();
  } else {
    slideshowState.browsePrev();
  }
  const steps = (currentIndex + step + size) % size;
  console.debug(`navigate steps:`, steps)
  await navigateTo(steps);
}

// Navigate to specific index
async function navigateTo(indexNumber = 0) {
  if (album.size === 0) {
    console.debug(`Album size = 0 at navigateTo`, album);
    disableViews();
    return;
  }
  clearAsyncUpdate();
  const ndx = isNumber(indexNumber) ? indexNumber : 0;
  currentIndex = ndx % album.size;
  divCount.classList.toggle('sequence');
  console.debug(`Update view at index:`, currentIndex);
  await updateCurrentView();
}

function onSwipe(event) {
  let eventApply = false;
  const ts = touchState;
  if (event instanceof Event && ts.swipeWay) {
    let goNext = ts.swipeLeft || ts.swipeUp;
    let goPrev = ts.swipeRight || ts.swipeDown;
    console.debug(`onSwipe vlevel=${ts.vLevel}, zone=${ts.zone}, swipe=${ts.swipeWay}, prev=${goPrev}, next=${goNext}, state:`, ts);
    eventApply = goNext || goPrev;
    if (goPrev) {
      navigate(-1);
    } else if (goNext) {
      navigate(1);
    }
    if (eventApply) {
      // prevent from parent containers listener
      event.stopPropagation();
      flashMobileControls();
    }
  }
  return eventApply;
}

function onTouchTap(event) {
  let eventApply = false;
  const ts = touchState;
  if (event instanceof Event && ts.zone) {
    let center = ts.startAtCenter;
    let atEdge = ts.startAtLower || ts.startAtUpper;
    let goNext = ts.startAtRight && !atEdge;
    let goPrev = ts.startAtLeft && !atEdge;
    console.debug(`onTouchTap vlevel=${ts.vLevel}, zone=${ts.zone}, center=${center}, prev=${goPrev}, next=${goNext} touchState:`, ts);
    eventApply = center || goNext || goPrev;
    if (eventApply) {
      console.debug(`onTouchTap: stopping propagation...`);
      // prevent from parent containers listener
      event.stopPropagation();
    }
    if (center) {
      clearControls();
    } else if (goPrev) {
      navigate(-1);
    } else if (goNext) {
      navigate(1);
    }
    if (goPrev || goNext) {
      flashMobileControls();
    }
  }
  return eventApply;
}

function openCurrentImage() {
  if (album.size === 0) return;
  if (currentEnabled == false) return;

  try {
    const currentImg = album.data[currentIndex];
    const openTarget = openUrl(currentImg.srcUrl);
    if (openTarget) {
      openTarget.location = currentImg.srcUrl;
      /*
      openTarget.document.write(`
        <style type="text/css">
          img {
            display: block;
            height: auto;
            max-width: 100vw;
            margin: auto;
            width: auto;
          }
        </style>
        <img src="${currentImg.srcUrl}"/>`);
      */
      openTarget.blur();
      window.focus();
    }
  } catch(error) {
    outputError(error);
  }
}

// Playback loop routines logic configurations
function playSlideshow() {
  clearAsyncUpdate(true);
  let ssv = slideshowState;
  let num = ssv.cycling(elemIntv.value);
  // structural clean values synchronization
  elemIntv.value = num;

  const attr = 'aria-disabled';
  const aVal = btnSlide.getAttribute(attr);
  const sVal = 'true';
  btnSlide.setAttribute(attr, sVal);
  btnSlide.textContent = slideshowState.stopName;

  const step = slideshowState.prev ? -1 : 1;
  const desc = step < 0 ? '<<Backward<<' : '>>Forward>>';
  slideshowTimer = setInterval(() => {
    navigate(step, true);
  }, num * 1000);
  const name = slideshowState.startName;
  console.info(`Applied ${name}: ${num}s ${desc} | ${attr}[${aVal}] => ${sVal}`);
  elemIntv.disabled = true;
}

// Stop the slideshow
function quitSlideshow() {
  let applied = false;
  if (slideshowTimer) {
    clearInterval(slideshowTimer);
    slideshowTimer = null;
    applied = true;
  }
  const attr = 'aria-disabled';
  const aVal = btnSlide.getAttribute(attr);
  btnSlide.setAttribute(attr, 'false');
  const sVal = btnSlide.getAttribute(attr);
  btnSlide.textContent = slideshowState.startName;
  const text = `Applied ${slideshowState.stopName} | ${attr}[${aVal}] => ${sVal}`;
  if (!applied) {
    console.debug(text);
  } else {
    console.info(text);
  }
  elemIntv.disabled = false;
}

function renderBasic(item) {
  if (!item) return '';

  let divInfo = `
    <div class="p-exif-bar">
      <span class="p-exif-tag">Path</span>
      ${item.path}
    </div>`;
  if (showLocal && item.file) {
    console.debug(`File:`, item.file);
    divInfo = `
    <div class="p-exif-bar">
      <span class="p-exif-tag">Last Modified</span>
      ${toISOString(item.file.lastModifiedDate)}
    </div>`;
  }
  let content = `
    <div class="p-exif-bar">
      <span class="p-exif-tag">Name</span>
      ${item.name}
    </div>${divInfo}`;
  return content;
}

// Render file info and metadata from payload tags
async function renderExifInfo(item, seqNum) {
  if (!item.file) {
    renderMockInfo(item);
    return;
  }
  // console.info(`Item: `, item, item.file);

  let error = '';
  let gpsTags = {};
  let parts = [];
  let emptysp = '<p><br/><br/><br/><br/><br/></p>';
  let content = '';

  renderFileInfo(parts, item, seqNum);

  if (item.exif) {
    for (const [key, nameLabel] of Object.entries(exifKeyLookup)) {
      let sValue = item.exif[key];
      if (!sValue || key.startsWith('GPS')) continue;
      content = `
      <div class="p-exif-bar">
        <span class="p-exif-tag">${nameLabel}</span>
        ${sValue}
      </div>`;
      parts.push(content);
    }
    await setExifAddress(item, true);
    if (item.exif['address']) {
      content = `
      <div class="p-exif-bar">
        <span class="p-exif-tag">Location</span>
        ${item.exif['address']}
      </div>`;
      parts.push(content);
    }
  } else if (!item.tags) {
    error = `
      <div class="p-exif-bar">
        <span class="p-exif-tag">Others</span>
        <em>Invalid or missing structural metadata</em>
      </div>`;
  } else {
    error = `
      <div class="p-exif-bar">
        <em>No nested system EXIF fields parsed.</em>
      </div>`;
  }
  const gpsData = item.gpsData; // [latitude, longitude]
  if (gpsData && gpsData.length == 2) {
    renderLocation(parts, gpsData);
  }
  if (error) {
    parts.push(error);
  }
  parts.push(emptysp); // empty space to scroll
  exifInfo.innerHTML = parts.join('');
}

function renderFileInfo(parts, item, seqNum) {
  if (!item) return;
  let basic = renderBasic(item);
  let content = `${basic}
      <div class="p-exif-bar">
        <span class="p-exif-tag">Size</span>
        ${(item.file.size / 1024).toFixed(1)} KB
      </div>
      <div class="p-exif-bar">
        <span class="p-exif-tag">Date Captured</span>
        ${toISOString(item.dateCaptured)}
      </div>`;
  let seqInfo = `
      <div class="p-exif-bar">
        <span class="p-exif-tag">#</span>
        ${seqNum}
      </div>`;
  parts.push(seqInfo);
  parts.push(content);
}

function renderLocation(parts, gpsLoc) {
  if (!gpsLoc || gpsLoc.length != 2) {
    console.debug(`renderLocation: no valid GPS location`);
    return;
  }
  let content = '';
  let svcData = toGPSServices(gpsLoc);
  if (hasDictionaryData(svcData)) {
    let sHtml = [];
    for (const svc of svcData) {
      sHtml.push(`
        <a onClick="onClickOpen(event)" target="maps"
           href="${svc.url}" title="${svc.gpsLoc}"
           rel="opener referrer">${svc.name}</a>`);
    }
    // console.debug(`rederLocation`, sHtml);
    if (sHtml.length > 0) {
      content = `
      <div class="p-exif-bar p-exif-loc" id="p-exif-loc">
        <span class="p-exif-tag">Maps</span>
        ${sHtml.join('\n<br/> ・ ')}
      </div>`;
    }
  }
  if (content) {
    parts.push(content);
  }
}

function renderMockInfo(item) {
  if (item) {
    let html = '';
    let poem = dataLookup.names[item.name];
    if (poem) {
      let url = `${baseSite}/${basePage}#${poem.pid}`;
      let alt = `alt="${poem.dateStamp} | ${poem.dateYears}"`;
      let att = `href="${url}" target="_myPage" ${alt}`;
      html = `
      <div class="p-exif-bar">
        <span class="p-exif-tag">Poem Title</span>
        <a ${att} title="${poem.dateStamp}>${poem.title}</a>
      </div>`;
    }
    exifInfo.innerHTML = `
      <div class="p-exif-bar">
        <span class="p-exif-tag">Source</span>
        ${item.name}
      </div>
      <div class="p-exif-bar">
        <span class="p-exif-tag">Source Path</span>
        ${item.path}
      </div>
      ${html}
      <div class="p-exif-bar">
        <span class="p-exif-tag">Mock Capture Date</span>
        ${toISOString(item.dateCaptured)}
      </div>
      <div class="p-exif-bar">
        <span class="p-exif-tag">Notice</span>
        Failed to load selected file and parsed EXIF data
      </div>`;
  }
}

// Refresh custom static images
async function refresh() {
  hideAwait();
  quitSlideshow();
  clearAsyncUpdate(true);
  showLocal = false;

  await reloadAlbum();
  await updateView();
}

async function refreshOnStart() {
  const querykey = getQueryKeyFromUrl();
  const data = dataLookup.query[querykey];

  if (querykey) {
    console.info(`Lookup by query [${querykey}]:`, data);
  }

  // data.files not-null meaning its items
  // have been used as keys of dataLooup.files
  // see buildLookup()
  if (data && data.files) {
    quitSlideshow();
    await reloadAlbum();
    const filename = data.files[0];
    const newIndex = dataLookup.files[filename] % album.size;
    const msg = `Resolved query key [${querykey}]`;
    const ext = `album index = ${newIndex} / ${album.size}`;
    console.info(`${msg}: ${filename}, ${ext}`);
    navigateTo(newIndex);
    return;
  }
  animateCover(secAnimation, true);
  await refresh();
}

async function reloadAlbum() {
  showAwait();
  await album.loadAlbum(true); // with deferred file and tags
  sortAlbumByDate();
  hideAwait();
}

function sortAlbumByDate() {
  album.sortByDate(); // Execute sorting date directly
  console.debug(`dataLookup`, dataLookup);
  dataLookup.files = dataFilesToIndex(
    album.data.map(o => o.name));
  const msg = 'Sorted album rebuilt dataLookup.files:';
  console.info(msg, dataLookup);
}

// Control UI per status on/off awaiting to load images
function hideAwait(bFlag = true) {
  if (bFlag || bFlag === undefined) {
    // console.info('Awaiting hide');
    divAwait.style.display = 'none';
    divAwait.style.opacity = 0;
    divAwait.style.visibility = 'hidden';
    curImage.style.opacity = 1;
    gifExifP.style.display = 'none';
    gifExifP.style.opacity = 0;
    gifFiles.style.opacity = 0;
    gifStats.style.opacity = 0;
    divCount.classList.remove('await');
    clikZone.innerText = '';
  } else {
    curImage.src = coverImage;
    curImage.style.opacity = 0.5;
    divAwait.style.display = 'block';
    divAwait.style.opacity = 1;
    divAwait.style.visibility = 'visible';
    clikZone.innerText = "... LOADING ...";
    divCount.classList.add('await');
    if (onRefresh) {
      exifInfo.innerHTML = `
        Refreshing images load<br/>...<br/>
        Process may take a while<br/>...`;
    }
    // console.info('Awaiting show: ', clikZone);
    if (showLocal) {
      gifFiles.style.opacity = 1;
    } else {
      gifStats.style.opacity = 1;
    }
    gifExifP.style.opacity = 1;
    gifExifP.style.display = 'inline-block';
    numFiles.style.display = 'none';
    numStats.style.display = 'none';
    numFiles.innerText = "";
    numStats.innerText = "";
  }
}
function showAwait(bFlag = true) {
  if (bFlag || bFlag === undefined) {
    hideAwait(false);
  } else {
    hideAwait(true);
  }
}

function hideAwaitExif(bFlag) {
  if (bFlag || bFlag === undefined) {
    gifExifP.style.display = 'none';
    gifExifP.style.opacity = 0;
  } else {
    gifExifP.style.display = 'inline-block';
    gifExifP.style.opacity = 1;
  }
}
function showAwaitExif(bFlag = true) {
  if (bFlag || bFlag === undefined) {
    hideAwaitExif(false);
  } else {
    hideAwaitExif(true);
  }
}

// Start updating album data per file
async function updateAlbum() {
  if (asyncCycled || album.isFullyLoaded) return;

  const release = await asyncMutex.acquire();
  try {
    asyncUpdate = true;
    let count = 0;
    let x = (currentIndex + 1) % album.size;
    console.debug(`Async update started [${x}]:`, album.data[x]);
    for (; count < album.size;) {
      let item = album.data[x];
      let test = item.file == null ? '[file==null]' : '';
      console.debug(`Async update${test} check:`, x, item);
      if (asyncUpdate && !album.isFullyLoaded) {
        let okay = await album.updateItem(x);
        console.debug(`Async update${test} index:`, x, item);
        if (item.file && test) {
          enableCount(); // update counter style
        }
        x = ++x % album.size;
      } else {
        clearAsyncUpdate(!album.isFullyLoaded);
        break;
      }
      console.debug("Async update count:", count);
      if (++count >= album.size) {
        let num = album.countLoaded * 100 / album.size;
        let fix = album.countLoaded == 0 ? 'empty' : num.toFixed(1);
        let ex1 = `Loaded: ${album.countLoaded}`;
        let ex2 = `${album.size} images [${fix} %]`;
        let msg = `Async update completed a cycle.`;
        console.info(`${ex1} / ${ex2}\n${msg}`);
        asyncCycled = album.countLoaded > defFairCount;
        asyncUpdate = false;
      }
    }
  } finally {
    release();
  }
}

// Update current image view and EXIF info
async function updateCurrentView(onInit = false) {
    const seqNum = currentIndex + 1;
    const activeItem = album.data[currentIndex] ?? null;
    const name = activeItem ? activeItem.name : 'N/A';
    if (activeItem == null) {
      console.error(`Current index == ${currentIndex}, album size == ${album.size}`);
      disableImage(errorImage); // from const.js
      return;
    }
    enableViews(onInit);
    clearAsyncUpdate();

    if (activeItem.file) {
      console.debug(`Current [${currentIndex}]:`, activeItem);
      curImage.src = activeItem.srcUrl;
      curImage.alt = `${name} [${seqNum} / ${album.size}]`;
    } else {
      disableImage();
    }

    if (!activeItem.parsedTags) {
      showAwaitExif()
      if (showLocal) {
        await setDatumTags(activeItem);
      } else {
        // updating both file and tags
        let okay = await album.updateItem(currentIndex);
        if (okay) {
          enableImage();
        } else {
          disableImage(awaitImage);
          renderMockInfo(activeItem);
          hideAwaitExif();
          await updateAlbum();
          return;
        }
      }
    }
    console.debug(`Current [${currentIndex}]:`, name);
    await renderExifInfo(activeItem, seqNum);
    hideAwaitExif();
    enableImage();
    await updateAlbum();
}

// Refresh rendering pipeline step layout updates
async function updateView() {
  digitNum.innerText = `${album.size}`;
  if (!showLocal) {
    currentIndex = album.size - 1;
  }
  await updateCurrentView(true);

  const nodata = album.countLoaded == 0;
  if (nodata || album.size === 0) {
    console.debug(`updateView: countLoaded = ${album.countLoaded} / ${album.size}`, album);
    disableViews();
  }
}

/*****************************
 * All event listeners
 *****************************/

// Touch Handling Trackers: Swipe gesture logic mapping
boxImage.addEventListener('touchstart', (event) => {
  touchState.onTouchStart(event);
  flashMobileControls();
}, {
  passive: true
});
boxImage.addEventListener('touchend', (event) => {
  touchState.onTouchEnd(event);
  onSwipe(event);
  flashMobileControls();
}, {
  passive: true
});

// File buffer extraction processor layer
hidFiles.addEventListener('change', async (event) => {
  await loadFiles(event);
  btnFiles.blur();
});
btnFiles.addEventListener('keydown', (event) => {
  onKeydownButton(event, btnFiles, hidFiles);
});

btnFresh.addEventListener('click', async (event) => {
  event.stopPropagation();
  onRefresh = true;
  animateCover(1);
  await refresh();
});
btnFresh.addEventListener('keydown', (event) => {
  onKeydownButton(event, btnFresh);
});

// Open current image
btnOpenP.addEventListener('click', (event) => {
  // Avoid triggering unexpected parent layout events
  event.stopPropagation();
  openCurrentImage();
});
btnOpenP.addEventListener('keydown', (event) => {
  onKeydownButton(event, btnOpenP);
});

// Flash controls when manually clicking navigation keys directly
btnPrevP.addEventListener('touchstart',
  flashMobileControls, { passive: true });
btnNextP.addEventListener('touchstart',
  flashMobileControls, { passive: true });

// Input control events binding sequences
btnPrevP.addEventListener('click', (event) => {
  event.stopPropagation();
  navigate(-1);
});
btnNextP.addEventListener('click', (event) => {
  event.stopPropagation();
  navigate(1);
});

// Control slideshow
btnSlide.addEventListener('click', async (event) => {
  const release = await slideshowMutex.acquire();
  try {
    event.stopPropagation();
    if (slideshowTimer) {
      event.preventDefault();
      quitSlideshow();
    } else {
      playSlideshow();
    }
  } finally {
    release();
  }
});
btnSlide.addEventListener('keydown', (event) => {
  onKeydownButton(event, btnSlide);
});

// Centralized target window router restricted exclusively to the middle click zone node
clikZone.addEventListener('click', (event) => {
  // Avoid triggering unexpected parent layout events
  event.stopPropagation();
  console.debug("Clearing controls by click-zone ...");
  clearControls();
});
clikZone.addEventListener('keydown', (event) => {
  if (onKeydownEnterOrSpace(event)) {
    event.stopPropagation();
    console.debug("Clearing controls by click-zone keydown ...");
    clearControls();
  }
});

elemIntv.addEventListener('input', (event) => {
  this.value = slideshowState.cycling(this.value);
});

// Optional: Handle native arrow keys smoothly before browser constraints kick in
elemIntv.addEventListener('keydown', function(e) {
  let ssv = slideshowState;
  let num = getInteger(this.value, ssv.default);
  if (isNaN(num) || num == 0) {
    e.preventDefault(); // Stop native increment
    this.value = ssv.default;
  } else if (e.key === 'ArrowUp' && num === ssv.max) {
    e.preventDefault(); // Stop native increment
    this.value = ssv.min; // Rotate to min
  } else if (e.key === 'ArrowDown' && num === ssv.min) {
    e.preventDefault(); // Stop native decrement
    this.value = ssv.max; // Rotate to max
  }
});

// Show cover on the page finishes loading
window.addEventListener('DOMContentLoaded', async () => {
  await refreshOnStart();
});

// Keyboard bindings configurations mapping
window.addEventListener('keydown', (event) => {
  // avoid stealing input field updates
  if (document.activeElement === elemIntv) return;
  console.debug(`window keydown: code=${event.code}, key=${event.key}`)

  switch (event.key) {
    case 'ArrowLeft':
      navigate(-1);
      break;
    case 'ArrowRight':
      navigate(1);
      break;
    case 'PageUp':
      navigate(-pageSize); // backward browse step metrics
      break;
    case 'PageDown':
      navigate(pageSize); // forward browse step metrics
      break;
  }
});

// Screen edge side-tap detector with upper/lower margin exclusions
window.addEventListener('touchstart', (event) => {
  touchState.onTouchStart(event);
  flashMobileControls();
}, { passive: true });

window.addEventListener('touchend', (event) => {
  touchState.onTouchEnd(event);
  // selective controls can be ignore on touch
  for (const area of selectiveToIgnore) {
    if (event.target.closest(area)) {
      console.debug(`Screen touched around ${area}`);
      return;
    }
  }
  if (onSwipe(event)) return;
  onTouchTap(event);
}, { passive: true });

// Execute application startup routines sequence
(async () => {
  buildLookup(); // should always run first
})();
