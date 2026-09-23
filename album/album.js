/*
 * album.js - depends on other album-*.js
 */

/*****************************
* Album state setting
*****************************/
let currentIndex = 0;
let currentEnabled = false;
let currentState = '';
let asyncUpdate = false;
let asyncCycled = false;
let controlFadeTimeout = null;
let slideshowTimer = null;
let secAnimation = 3; // seconds of animation duration
let clearZone = false;
let showLocal = false;
let onRefresh = false;

// Gesture State Tracker Values
let touchStartX = 0;
let touchStartY = 0;

// minimum em/px movement scale requirements
const horizontalSwipeThreshold = 40;

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
function animateCover(seconds = 1, init = false) {
  if (!divCover) return;
  let sec = getIntegerByRange(seconds, 1, secAnimation);
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
  if (init) {
    buildLookup();
  }
}

function clearAsyncUpdate(clearCycled = false) {
  if (clearCycled) {
    console.info("Async update: new cycle available.");
    asyncCycled = false;
  }
  asyncUpdate = false;
}

// Show current imaage and toggle others visibility
function clearControls() {
  // console.debug(`clearZone state = ${clearZone}`);
  for (const elem of controls) {
    elem.style.visibility =
      clearZone ? 'collapse' : 'visible';
  }
  if (clearZone) {
    clearZone = false;
  } else {
    clearZone = true;
  }
}

function disableImage(errImageSrc) {
  btnOpenP.style.opacity = 0;
  clikZone.classList.add('disabled');
  curImage.classList.add('disabled');
  curImage.src = errImageSrc ?? danceImage;
  currentEnabled = false;
}

function disableViews() {
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
    let count = album.length;
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
    numStats.innerText = `${album.length}`;
    numStats.opacity = 1;
    clearClassList(digitNum);
    digitNum.classList.add(spanClass);
    divCount.classList.add('ready');
  }
  // console.debug(`#digitNum class: ${digitNum.className}`);
  currentState = spanClass;
}

function enableImage() {
  btnOpenP.style.opacity = 1;
  btnOpenP.style.display = 'inline-block';
  clikZone.classList.toggle('active');
  curImage.classList.remove('disabled');
  curImage.src = album.data[currentIndex].srcUrl;
  currentEnabled = true;
}

function enableViews() {
  btnOpenP.classList.remove('disabled');
  btnSlide.innerText = "Start Slideshow";
  btnSlide.setAttribute('aria-disabled', false);
  divSlide.style.pointerEvents = 'auto';
  clikZone.title = "See Image Info panel";
  clikZone.innerText = '';

  enableCount();

  console.info("Album enabled.");
}

// Function to wake up and hold navigation visibility values on mobile interactions
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
  console.info("On input file event change:", event);
  const rawFiles = Array.from(event.target.files);
  if (rawFiles.length === 0) return;
  console.log(rawFiles);

  quitSlideshow();
  exifInfo.innerHTML = `
    Filtering & parsing items chronologically
    <br/>...<br/>
    This may take a while
    <br/>...`;

  const verifiedTempList = [];
  console.log("Parsing local image files ...");

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
    album.loadFromList(verifiedTempList);
    await sortAlbum(); // Execute metadata sorting sequence directly
    await updateView();
  } else {
    exifInfo.innerHTML = `
      Processing Error:<br/>No valid image loaded`;
    disableViews();
  }
}

// Pagination increments looping boundary indices
async function navigate(step) {
  if (album.length === 0) {
    return;
  }
  clearAsyncUpdate();
  let steps = currentIndex + step + album.length;
  currentIndex = steps % album.length;
  divCount.classList.toggle('sequence');
  await updateCurrentView();
}

function openCurrentImage() {
  if (album.length === 0) return;
  if (currentEnabled == false) return;

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
}

// Playback loop routines logic configurations
function playSlideshow() {
  clearAsyncUpdate(true);
  let secIntv = parseInt(elemIntv.value, 10);
  if (isNaN(secIntv) || secIntv < 1) secIntv = 1;
  if (secIntv > 9) secIntv = 9;
  elemIntv.value = secIntv; // structural clean values synchronization

  btnSlide.textContent = "Stop Slideshow";
  slideshowTimer = setInterval(() => {
    navigate(1);
  }, secIntv * 1000);
  elemIntv.disabled = true;
}

// Stop the slideshow
function quitSlideshow() {
  if (slideshowTimer) {
    clearInterval(slideshowTimer);
    slideshowTimer = null;
  }
  btnSlide.textContent = "Start Slideshow";
  elemIntv.disabled = false;
}

// Render file info and metadata from payload tags
function renderExifInfo(item, seqNum) {
  if (!item.file) {
    renderMockInfo(item);
    return;
  }
  // console.info(`Item: `, item, item.file);

  let error = '';
  let gpsData = []; // [latitude, longitude]
  let gpsTags = {};
  let parts = [];
  let emptysp = '<p><br/><br/><br/><br/><br/></p>';
  let content = '';

  renderFileInfo(parts, item, seqNum);

  if (item.tags) {
    let hasLookupTags = false;
    let tagValue;
    for (const [key, nameLabel] of Object.entries(exifKeyLookup)) {
      tagValue = item.tags[key];
      if (!tagValue) continue;
      if (key.startsWith('GPS')) {
        gpsTags[key] = tagValue;
        continue;
      }
      let sValue = convertUtf8(tagValue);
      // console.debug(`key: ${key}, value: ${sValue}`);
      if (key == "caption") {
        // console.debug(`CAPTION: `, sValue);
        sValue = sValue.split(/[\r\n\-#]/)[0];
        if (sValue.length > maxLength) {
          sValue = sValue.slice(0, maxLength) + '...';
        }
      }
      if (key == "ExposureTime") {
        let sv = Math.round(1 / sValue);
        sValue = `1 / ${sv}`;
      }
      content = `
      <div class="p-exif-bar">
        <span class="p-exif-tag">${nameLabel}</span>
        ${sValue}
      </div>`;
      hasLookupTags = true;
      parts.push(content);
    }

    if (hasLookupTags) {
      gpsData = toGPSLocation(gpsTags);
    } else {
      error = `
      <div class="p-exif-bar">
        <em>No nested system EXIF fields parsed.</em>
      </div>`;
    }
  } else {
    error = `
      <div class="p-exif-bar">
        <span class="p-exif-tag">Others</span>
        <em>Invalid or missing structural metadata</em>
      </div>`;
  }
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
  let content = `
      <div class="p-exif-bar">
        <span class="p-exif-tag">Name</span>
        ${item.name}
      </div>
      <div class="p-exif-bar">
        <span class="p-exif-tag">Path</span>
        ${item.path}
      </div>
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
    // console.debug(sHtml);
    if (sHtml.length > 0) {
      content = `
      <div class="p-exif-bar p-exif-loc" id="p-exif-loc">
        <span class="p-exif-tag">Location</span>
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
    exifInfo.innerHTML = `
      <div class="p-exif-bar">
        <span class="p-exif-tag">Source</span>
        ${item.name}
      </div>
      <div class="p-exif-bar">
        <span class="p-exif-tag">Source Path</span>
        ${item.path}
      </div>
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
  if (slideshowTimer) {
    quitSlideshow();
  }
  clearAsyncUpdate(true);
  showLocal = false;

  showAwait();
  await album.loadAlbum(true); // with deferred file and tags
  hideAwait();
  await updateView();
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

// Core Filtering / Sorting Engine algorithm
async function sortAlbum() {
  album.data.sort((alpha, beta) => {
    if (!alpha.dateCaptured) return -1;
    if (!beta.dateCaptured) return 1;
    // Chronological ascending arrangement configuration
    return alpha.dateCaptured - beta.dateCaptured;
  });
}

// Start updating album data per file
async function updateAlbum() {
  if (asyncCycled || album.isFullyLoaded) return;

  asyncUpdate = true;
  let count = 0;
  let x = (currentIndex + 1) % album.length;
  // console.debug(`Async update started [${x}]:`, album.data[x]);
  for (; count < album.length;) {
    let item = album.data[x];
    let test = item.file == null ? '[file==null]' : '';
    // console.debug(`Async update${test} check:`, x, item);
    if (asyncUpdate && !album.isFullyLoaded) {
      let okay = await album.updateItem(x);
      // console.debug(`Async update${test} index:`, x, item);
      if (item.file && test) {
        enableCount(); // update counter style
      }
      x = ++x % album.length;
    } else {
      clearAsyncUpdate(!album.isFullyLoaded);
      break;
    }
    // console.debug("Async update count:", count);
    if (++count >= album.length) {
      let num = album.countLoaded * 100 / album.length;
      let fix = album.countLoaded == 0 ? 'empty' : num.toFixed(1);
      let ex1 = `Loaded: ${album.countLoaded}`;
      let ex2 = `${album.length} images [${fix} %]`;
      let msg = `Async update completed a cycle.`;
      console.info(`${ex1} / ${ex2}\n${msg}`);
      asyncCycled = album.countLoaded > defFairCount;
      asyncUpdate = false;
    }
  }
}

// Update current image view and EXIF info
async function updateCurrentView(onStep = true) {
    const seqNum = currentIndex + 1;
    const activeItem = album.data[currentIndex] ?? null;
    const name = activeItem.name;
    if (activeItem == null) {
      console.error(`Current index == ${currentIndex}, album size == ${album.length}`);
      disableImage(errorImage); // from const.js
      return;
    }
    clearAsyncUpdate();

    if (onStep) {
      digitNum.classList.add('step');
      digitNum.innerText = `${seqNum}`;
    }
    if (activeItem.file) {
      // console.debug(`Current [${currentIndex}]:`, activeItem);
      curImage.src = activeItem.srcUrl;
      curImage.alt = `${name} [${seqNum} / ${album.length}]`;
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
    // console.debug(`Current [${currentIndex}]:`, name);
    renderExifInfo(activeItem, seqNum);
    hideAwaitExif();
    enableImage();
    await updateAlbum();
}

// Refresh rendering pipeline step layout updates
async function updateView() {
  if (album.length === 0) {
    disableViews();
  } else {
    digitNum.innerText = `${album.length}`;
    currentIndex = album.length - 1;
    await updateCurrentView(false);
    enableViews();
  }
}

/*****************************
 * All event listeners
 *****************************/

// Touch Handling Trackers: Swipe gesture logic mapping
boxImage.addEventListener('touchstart', (event) => {
  touchStartX = event.changedTouches.screenX;
  touchStartY = event.changedTouches.screenY;
  flashMobileControls();
}, {
  passive: true
});
boxImage.addEventListener('touchend', (event) => {
  const currTouchX = event.changedTouches.screenX;
  const currTouchY = event.changedTouches.screenY;
  // deviation delta x and y
  const deviationX = currTouchX - touchStartX;
  const deviationY = currTouchY - touchStartY;

  if (Math.abs(deviationX) > Math.abs(deviationY) &&
      Math.abs(deviationX) > horizontalSwipeThreshold) {
    quitSlideshow();
    if (deviationX < 0) {
      navigate(-1);
    } else {
      navigate(1);
    }
  }
  flashMobileControls();
}, {
  passive: true
});

// File buffer extraction processor layer
hidFiles.addEventListener('change', async (event) => {
  await loadFiles(event);
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
  quitSlideshow();
  navigate(-1);
});
btnNextP.addEventListener('click', (event) => {
  event.stopPropagation();
  quitSlideshow();
  navigate(1);
});

// Control slideshow
btnSlide.addEventListener('click', (event) => {
  const value = btnSlide.getAttribute('aria-disabled')
  const state = value === 'true';
  if (state) {
    event.preventDefault();
  }
  btnSlide.setAttribute('aria-disabled', (!state).toString());

  event.stopPropagation();
  if (slideshowTimer) {
    quitSlideshow();
  } else {
    playSlideshow();
  }
});
btnSlide.addEventListener('keydown', (event) => {
  onKeydownButton(event, btnSlide);
});

// Centralized target window router restricted exclusively to the middle click zone node
clikZone.addEventListener('click', (event) => {
  // Avoid triggering unexpected parent layout events
  event.stopPropagation();
  // console.debug("Clearing controls by click-zone ...");
  clearControls();
});
clikZone.addEventListener('keydown', (event) => {
  if (onKeydownEnterOrSpace(event)) {
    event.stopPropagation();
    // console.debug("Clearing controls by click-zone keydown ...");
    clearControls();
  }
});

// Show cover on the page finishes loading
window.addEventListener('DOMContentLoaded', () => {
  animateCover(secAnimation, true);
});

// Keyboard bindings configurations mapping
window.addEventListener('keydown', (event) => {
  if (document.activeElement === elemIntv) return; // avoid stealing input field updates

  switch (event.key) {
    case 'ArrowLeft':
      quitSlideshow();
      navigate(-1);
      break;
    case 'ArrowRight':
      quitSlideshow();
      navigate(1);
      break;
    case 'PageUp':
      quitSlideshow();
      navigate(-5); // Quick block backward browse step metrics
      break;
    case 'PageDown':
      quitSlideshow();
      navigate(5); // Quick block forward browse step metrics
      break;
  }
});

// Screen edge side-tap detector with upper/lower margin exclusions
window.addEventListener('touchstart', (event) => {
  // selective controls can be ignore on touch
  for (const area of selectiveToIgnore) {
    if (event.target.closest(area)) {
      // console.debug(`Screen touched around ${area}`);
      return;
    }
  }
  // console.debug(`Screen height = ${window.innerHeight}`);
  // console.debug(`Screen -width = ${window.innerWidth}`);
  // extract precise coordinates of the touch point
  const touchX = event.touches[0].clientX;
  const touchY = event.touches[0].clientY;
  // console.debug(`Screen touched X = ${touchX}, Y = ${touchY}`);

  // get the center vertical midline dividing the screen halves
  const centerPos = window.innerWidth / 2;
  const centerGap = window.innerWidth / 4;
  const edgeLSide = centerPos - centerGap;
  const edgeRSide = centerPos + centerGap;
  // console.debug(`Screen edgeLSide = ${edgeLSide}`);
  // console.debug(`Screen edgeRight = ${edgeRSide}`);
  const centerBar = touchX > edgeLSide && touchX < edgeRSide;
  // console.debug(`Around midline: ${centerBar}`);
  if (centerBar) {
    // console.debug("Clearing controls by touch ...");
    clearControls();
    return;
  }

  // calculate dynamic vertical safety margin lines
  // using 15% from top and bottom
  const screenHeight = window.innerHeight;
  const edgeLower = screenHeight * 0.85;
  const edgeUpper = screenHeight * 0.15;
  const atLower = touchY > edgeLower;
  const atUpper = touchY < edgeUpper;

  // exit immediately on above likely corner area
  if (atUpper || atLower) return;

  // terminate active slideshow interval timers upon interaction
  quitSlideshow();

  // navigate based on screen halves:
  // Left side goes back, right side goes forward
  if (touchX < centerPos) {
    navigate(-1); // Tap within left active viewport band
  } else {
    navigate(1);  // Tap within right active viewport band
  }

  // highlight navigation layout buttons for input confirmation
  flashMobileControls();
}, { passive: true });

// Execute application startup routines sequence
(async () => {
  await refresh();
})();
