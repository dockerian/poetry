# 诗词影集 <a id="toc" name="toc"></a>

> 舟山堂＋纱糸轩：诗词、歌词・[相册｜Photo Album](index.html) of Poetry Collection.<br/>
> Designated Web URL: [http://dockerian.github.io/poetry/album/](./)<br/>
> Features and [Reference](#ref)


## Poetry Album &copy; 2026 Features

  * Static HTML and JavaScript code album app
  * Load a set of pre-defined static pictures, or optional from local image files
  * The images list may have a data lookup table per [shiji.html](../shiji.html)
  * The images list may optionally have data reference from [lyrics.html](../lyrics.html)
  * On fetch image URL, other than the basic image name, information, such as file size and EXIF metadata should be deferred to load in current view
  * The app page may read from URL query string to search and show matched image
  * The app page may NOT have search function without enough image info or rich database
  * The app page should navigate to an image per its file name or internal ID (including `#mulu` id and poem id from [shiji.html](../shiji.html), and lyrics id from [lyrics.html](../lyrics.html)); see [regexp code](#regexp)
  * The image height and width may vary and the viewbox container should be adjusted to fit the screen size
  * UI should display the number of loaded images
  * UI has Action panel and Image Info panel
  * The left-side of the screen has Action panel, including `Load Image Files`, Slideshow controls, and `Refresh` buttons
  * The right-side panel displays real EXIF info of the image (by importing external library)
  * The Action panel should be inside at corner of the container without taking extra space and active on mouse over
  * UI should allow using `Tab` (⇥) key to navigate through controls
  * UI uses `left` (&larr;), `right` (&rarr;) arrow key to browse images one by one in a loop; clickable controls are at edge of the window
  * UI uses `pgUp` / `Fn`+`↑`, `pgDn` / `Fn`+`↓` keys to quick forward and backward
  * UI navigation may have varied page size per album size
  * UI has slideshow start/stop toggle button with customizable interval seconds between `1` and `9`; the number can be input, or cycling adjusted by mouse wheel or `up` (&uarr;) and `down` (&darr;) keys
  * UI slideshow may follow previous user navigation, backward or forward, for its direction
  * UI has a `Refresh` button to reload page, in case of network error; this is different from browser page refresh, as it may remember URL query or user's navigation and show previous viewed photo after album reloaded
  * UI supports keyboard shortcuts as below:
    - `F4`: start slideshow from the first index
    - `F5`: refresh page to the first index and reset user navigation
    - `Home` (`Fn+◀`, `⌘+◀` or `↖` on MacOS): navigate to the first image
    - `End` (`Fn+▶`, `⌘+▶`, or `↘)` on MacOS): navigate to the last image
    - `←` (Left): navigate to previous index
    - `→` (Right): navigate to next index
  * UI should show only center image and toggle controls visibility on click or touch at center
  * UI has a button or optionally allows clicking center zone to open image in a new window
  * UI displays images counter at loading complete
  * UI displays image sequence number on browsing and slideshow
  * UI displays awaiting state on loading images and parsing EXIF data
  * UI may defer parsing EXIF metadata until the image is selected and displayed in current viewbox
  * UI may scroll only image information in EXIF panel with a sticky headline and other controls remain position
  * UI may show map links if EXIF metadata contains GPS (latitude `lat` and longitude `lng`) information. See [reference](#ref)
  * UI should show proper information on errors
  * Browser console may print info and errors
  * An option to filter and sort files by the date captured metadata
  * Responsive to desktop and mobile devices
  * Responsive to device screen between portrait and landscape layout
  * UI may support gestures on mobile devices
  * UI may append touch-swipe gestures for easier navigation on mobile screens
  * User may touch at right side or swipe to left for next image, touch at left side swipe to right, and touch at center to show a clear image without other surrounding UI controls or elements
  * Bad network connection or refreshing page should not crash the app and be informed on the screen
  * The app may use JavaScript modules or organize functions in different source files
  * CSS uses `em` instead of pixel measurements
  * Separated HTML, JavaScript, and CSS code

## Reference <a name="ref" id="ref"></a>

### EXIF library

  * [ExifReader](https://www.jsdelivr.com/package/npm/exifreader) by [jsdelivr](https://www.jsdelivr.com)
  * [EXIT](https://cdnjs.com/libraries/exif-js) Ajax class

### Maps URL <a name="mapurl" id="mapurl"></a>

  - Amap｜高德地图
    ```javascript
    const amapUri = 'https://uri.amap.com';
    const amapUrl = (lat, lng) => {
      return `${amapUri}/marker?position=${lng},${lat}`;
    };
    ```
  - Baidu｜百度地图
    ```javascript
    const baiduMapUri = 'https://api.map.baidu.com';
    const baiduMapUrl = (lat, lng) => {
      let marker = 'marker?location=';
      let output = 'output=html'; // must have
      return `${baiduMapUri}/${marker}${lat},${lng}&${output}`;
    };
    ```
  - Google Maps Search (official API)
    ```javascript
    let gooSearch = 'https://google.com/maps/search/';
    let url = `${gooSearch}?api=1&query=${lat},${lng}`;
    ```
  - Google Maps
    ```javascript
    let googleMapSite = 'https://maps.google.com';
    let url = `${googleMapSite}/?q=${lat},${lng}`;
    ```

### Maps API <a name="mapapi" id="mapapi"></a>

#### Reverse Geocoding

Nominatim API provide an address from a coordinate given as latitude and longitude. See [API manual](https://nominatim.org/release-docs/develop/api/Reverse/).

  ```javascript
  const api = 'https://nominatim.openstreetmap.org/reverse';
  const params = 'addressdetails=1&namedetails=1&zoom=16&format=json';
  const url = `${api}?lat=${lat}&lon=${lon}&${params}`;
  const res = await fetch(url, {
    headers: { // API requires these headers
      'Access-Control-Allow-Origin' : '*',
      'User-Agent': 'App/1.0 (user@gmail.com)'
    }});
  const data = await res.json();
  ```


### RegExp <a name="regexp" id="regexp"></a>

The [shiji.html](../shiji.html) and [lyrics.html](../lyrics.html) pages have `#mulu` section, as a TOC (Table of Contents), to include all normalized poems or lyrics info. This Poetry Photo app may use regular expression to build a simple Javascript dictionary.

- [lyrics.html](../lyrics.html#mulu)

  * regexp search in `#mulu`:

    >`<li id="d(.+?)" class="(.+?)" name="(.+?)-li">.*?<a href="((#p\1)|(.+?))" title="(.+?)( \((.+)\))*｜(.+?)｜([^a-z "=]+?)".*>.*?<([bcde])>(.*?)</\12>[〖【](.+?)[】〗] <i>(\d\d\d\d)\.(\d\d)\.(\d\d)\.</i></a></li>\n`

  * replace to data:

    ```javascript
    { name: "$3-$1", dateStamp: "$15.$16.$17", dateymd: "$15-$16-$17", mulu: "d$1", pid: "p$1$6", type: "$11", subject: "$10", title: "$7｜$10", titleEng: "$7", tags: "$2 $3", dataFile: "", source: "$6", orig: "$9" },\n
    ```

- [shiji.html](../shiji.html#mulu)

  * regexp search in `#mulu`:

    >`<p id="y(.+?)" +data-num="(\d\d)">(.+?) (.+?)・(.+?)　+<a href="#(.+?)" title="(.+?) \| (.+?)" data-ymd="(\d\d\d\d)-(\d\d)-(\d\d)" data-tags="(.+?)" data-regex="(.*?)">(.+?)</a>.*\n`

  * replace to:

    ```javascript
    { name: "$1", dateStamp: "$9.$10.$11", dateYears: "$8", dateymd: "$9-$10-$11", mulu: "y$1", pid: "$6", num: $2, dataFile: "$13", status: "$12", subject: "$5", title: "$4・$5", type: "$4" },\n
    ```

- **notes**:
  * The HTML pages do not have image file names or info.
  * The [lyrics.html](../lyrics.html#mulu) `#mulu li` use `class` and `name` attributes for tagging. Since some tags have format like `tagName-li` where the "`-li`" part is only used within `#atoc #mulu`, the tag name for the content **should have "`-li`" removed** in later process.
  * The [lyrics.html](../lyrics.html#mulu) `#mulu li` use Chinese bracket characters to differentiate a main Chinese or English content. Also, any text ends with "`...`" indicating an incomplete title.
    - `Chinese Song or Blog Title〖中文标题〗`
    - `English Song Title ...【中文译名】`
    - `English Poem Title【中文标题】`
  * The [lyrics.html](../lyrics.html#mulu) `#mulu li` use html tag `<b></b>` and undefined inline tags, `c`, `d`, `e`, around the lyrics title for conventional categories.
    - `<b>A Chinese Blog Poem</b>〖中文标题〗`
    - `<c>Chinese cover of English song title ...</c>〖中文歌名〗`
    - `<e>English cover of Chinese song</e>【中文译名】`
    - `<d>An English Poem Title</d>【中文标题】`


<p><br/></p>

&raquo; Back to [Album](./index.html)｜[Contents](#toc)｜[Home](../README.md)

<div style="display:none" markdown="0"><!--stylesheet-->
<style type="text/css"><!--
*, *::before, *::after {
  box-sizing: border-box;
}
::selection {
  background-color: lightgray;
  color: darkred;
}
a {
  text-decoration: none;
}
a:hover {
  color: darkred !important;
  text-decoration: none !important;
  background-color: lightyellow;
}
body,h4,h5,li,p {
  font-size: 1.05em !important;
  line-height: 1.5em;
}
b, strong {
  color: darkcyan;
}
blockquote > p > code {
  display: inline-block;
  line-height: 1.5em;
  padding: 0.75em 0.5em 0.75em 0.5em;
  text-indent: -0.25em;
}
@media print {
  body,div,div#_html,p,code,pre {
    font-family: "Microsoft YaHei", "STHeiti", "Heiti SC", "PingFang SC", "微软雅黑", "黑体", "华文细黑", "Hiragino Sans GB", "Helvetica Neue", "Sarasa Gothic", "Source Code Pro", "Helvetica", "Verdana", sans-serif !important;
    font-size: 1.25em;
  }
  div>ul>li>p, div>ul>li>ul>li {
    font-size: 1.0em;
    margin: 0em 0em 0.35em !important;
  }
  div#anchor {
    display: none;
  }
}
--></style>
</div>
