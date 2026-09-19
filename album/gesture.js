/*
 * gesture.js
 * © 2026 Jason Zhu | Dockerian.
**/

// maximum tap duration (ms)
const msTouchDuration = 250;
// maximum swipe duration (ms)
const msSwipeDuration = 1500;
// minimum hold duration (ms)
const minHoldDuration = 500;
// maximum em/px allowed during the hold phase
const movingThreshold = 10;
// screen height position buffer ratio
const screenEdgeUpper = 0.15;
const screenEdgeLower = 0.85;
// minimum em/px movement scale requirements
const swipeThresholdX = 39;
const swipeThresholdY = 35;

// gesture zones and swipe states
const swipeToLeft = 's-Left';
const swipeToRight = 's-Right';
const swipeToDown = 's-Down';
const swipeToUp = 's-Up';
const touchAtLeft = 'Left';
const touchAtCenter = 'Center';
const touchAtRight = 'Right';
const touchAtMiddle = 'Middle';
const touchAtUpper = 'Upper';
const touchAtLower = 'Lower';

// Gesture class
class Gesture {
  // Constructor
  constructor() {
    this.endX = 0;
    this.endY = 0;
    this.startX = 0;
    this.startY = 0;
    this.startTime = 0;
    this.endTime = 0;
    this.deltaTime = 0;
    this.touchX = 0;
    this.touchY = 0;
    this.moveX = 0;
    this.moveY = 0;
    this.onHoldTimer = null;
    this.onHold = false;
    this.onMove = false;
    this.heightLvl = '';
    this.endZone = '';   // Left, Center, Right
    this.startZone = ''; // Left, Center, Right
    this.touchZone = ''; // Left, Center, Right
    this.swipeWay = '';
  }

  get onlyTap() {
    return this.deltaTime > 0 && this.deltaTime < msTouchDuration;
  }

  get onSwipe() {
    return this.deltaTime > 0 && this.deltaTime < msSwipeDuration;
  }

  get startAtLeft() {
    return this.touchZone === touchAtLeft;
  }

  get startAtMiddle() {
    return this.heightLvl === touchAtMiddle;
  }

  get startAtCenter() {
    return this.touchZone === touchAtCenter;
  }

  get startAtRight() {
    return this.touchZone === touchAtRight;
  }

  get swipeDown() {
    return this.swipeWay === swipeToDown;
  }

  get swipeLeft() {
    return this.swipeWay === swipeToLeft;
  }

  get swipeRight() {
    return this.swipeWay === swipeToRight;
  }

  get swipeUp() {
    return this.swipeWay === swipeToUp;
  }

  get vLevel() {
    return this.heightLvl;
  }

  get zone() {
    return this.touchZone;
  }

  clearHold() {
    clearTimeout(this.onHoldTimer);
    this.onHold = false;
  }

  getTouchHeightLevel(y) {
    // calculate dynamic vertical safety margin lines
    // using screenEdge values from top and bottom
    const screenHeight = window.innerHeight;
    const edgeLower = screenHeight * screenEdgeLower;
    const edgeUpper = screenHeight * screenEdgeUpper;
    const hzone = y > edgeLower ? touchAtLower
      : (y < edgeUpper ? touchAtUpper : touchAtMiddle);
    return hzone;
  }

  getTouchZone(x) {
    const edgeWidth = window.innerWidth;
    const edgeLSide = edgeWidth / 3;
    const edgeRSide = edgeWidth - edgeLSide;
    const centerBar = x > edgeLSide && x < edgeRSide;
    const zone = x < edgeLSide ?
      touchAtLeft : (x > edgeRSide ?
      touchAtRight : touchAtCenter);
    return zone;
  }

  getStartZone() {
    const touchX = this.touchX;
    const touchY = this.touchY;

    this.heightLvl = this.getTouchHeightLevel(touchY);
    this.startZone = this.getTouchZone(touchX);
    this.touchZone = this.startZone;

    return this.startZone;
  }

  // event handler on listener to 'touchstart'
  onTouchStart(e) {
    if (!(e instanceof Event)) return '';
    if (!(e.changedTouches[0] && e.changedTouches[0].clientX)) return '';

    this.deltaTime = 0;
    this.startTime = this.endTime = Date.now();
    // coordinate relative to the application's viewport,
    // excluding any scrolled-out parts or browser toolbars
    this.startX = e.changedTouches[0].clientX;
    this.startY = e.changedTouches[0].clientY;
    const x = this.moveX = this.endX = this.startX;
    const y = this.moveY = this.endY = this.startY;

    if (e.changedTouches && e.changedTouches.screenX) {
      // coordinates relative to physical screen/monitor
      this.touchX = e.changedTouches.screenX;
      this.touchY = e.changedTouches.screenY;
    } else {
      this.touchX = this.startX;
      this.touchY = this.startY;
    }
    const msg = `onTouchStart: x = ${x}, y = ${y}`
    console.debug(msg, this)
    return this.getStartZone();
  }

  // event handler on listener to 'touchstart' for hold checking
  onTouchStartHold(e, func) {
    if (!(e instanceof Event)) return;
    if (!(e.changedTouches[0] && e.changedTouches[0].clientX)) return;

    this.clearHold();
    this.onTouchStart(e);

    // start the timer for a long press/hold
    this.onHoldTimer = setTimeout(async () => {
      this.onHold = true;
      console.debug("onTouchStartHold calling func:");
      // trigger visual feedback here
      if (typeof func === 'function') {
        // optional to check func.constructor.name === 'AsyncFunction')
        // but a regular function may return a Promise
        // await will still work
        await func();
      }
    }, minHoldDuration);
  }

  // event handler on listener to 'touchmove'
  onTouchMove(e) {
    if (!(e instanceof Event)) return;
    if (!(e.changedTouches[0] && e.changedTouches[0].clientX)) return '';

    this.moveX = e.changedTouches[0].clientX;
    this.moveY = e.changedTouches[0].clientY;
    const dx = this.moveX - this.startX;
    const dy = this.moveY - this.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (!this.onHold) {
      // usually it means on swipe or scroll.
      // cancel the hold if the move is too much
      // before the timer fires.
      if (distance > movingThreshold) {
        clearTimeout(this.onHoldTimer);
      }
    } else {
      // prevent default behavior, e.g. page scrolling
      // while dragging
      if (e.cancelable) e.preventDefault();
      console.debug(`Dragging distance ${distance} [${dx},${dy}]`);
      // may start handling drag/movement
    }
  }

  // event handler on listener to 'touchcancel'
  onTouchCancel(e) {
    if (!(e instanceof Event)) return '';
    this.clearHold();
  }

  // event handler on listener to 'touchend'
  onTouchEnd(e) {
    if (!(e instanceof Event)) return '';
    if (!(e.changedTouches[0] && e.changedTouches[0].clientX)) return '';

    this.clearHold();

    this.endTime = Date.now();
    this.deltaTime = this.endTime - this.startTime;
    this.endX = e.changedTouches[0].clientX;
    this.endY = e.changedTouches[0].clientY;
    this.endZone = this.getTouchZone(this.endX);

    // deviation delta x and y
    const dX = this.endX - this.startX;
    const dY = this.endY - this.startY;
    const absX = Math.abs(dX);
    const absY = Math.abs(dY);
    const swipeAwayX = absX > absY && absX > swipeThresholdX;
    const swipeAwayY = absY > absX && absY > swipeThresholdY;

    if (swipeAwayX) {
      this.swipeWay = dX > 0 ? swipeToRight : swipeToLeft;
    } else if (swipeAwayY) {
      this.swipeWay = dY > 0 ? swipeToDown : swipeToUp;
    } else {
      this.swipeWay = '';
    }
    return this.swipeWay;
  }
}
// END class Gesture
