# 诗词影集 <a id="toc" name="toc"></a>

> 舟山堂＋纱糸轩：诗词、歌词・[相册｜Photo Album](index.html) of Poetry Collection.<br/>
> Designated Web URL: [http://dockerian.github.io/poetry/album/](./)


### Photo Album Features

  * JavaScript code album app
  * Load a set of pre-defined static pictures, or optional from local image files
  * On fetch image URL, other than the basic image name, information, such as file size and EXIF metadata should be deferred to load as current view
  * The image height and width may vary and the viewbox container should be adjusted to fit the screen size
  * UI has Action panel and Image Info panel
  * Right-side panel displays real EXIF info of the image (by importing external library)
  * The Action panel, including `Load Image Files`, Slideshow controls, and `Refresh` buttons, at left side of the screen
  * The Action panel should be inside at corner of the container without taking extra space and active on mouse over
  * UI should allow using `Tab` (⇥) key to navigate through controls
  * UI uses `left` (&larr;), `right` (&rarr;) arrow key to browse images one by one in a loop; clickable controls are at edge of the window
  * UI uses `pgUp` / `Fn`+`↑`, `pgDn` / `Fn`+`↓` keys to quick forward and backward
  * UI has button or allow clicking center zone to open image in a new window
  * UI has slideshow start/stop toggle button with customizable interval seconds between `1` and `9`
  * UI should show only center image and toggle controls visibility on click or touch at center
  * UI displays images counter at loading complete
  * UI displays image sequence number on browsing and slideshow
  * UI displays awaiting state on loading images and parsing EXIF data
  * UI may defer parsing EXIF metadata until the image is selected and displayed in current viewbox
  * UI may scroll only image information in EXIF panel with a sticky headline and other controls remain position
  * UI may support gestures on mobile devices
  * UI may show map links if EXIF metadata contains GPS (latitude `lat` and longitude `lng`) information. See [reference](#ref)
  * UI should show proper information on errors
  * Browser console may print info and errors
  * An option to filter and sort files by the date captured metadata
  * Responsive to desktop and mobile devices
  * Responsive to device screen between portrait and landscape layout
  * May append touch-swipe gestures for easier navigation on mobile screens
  * CSS uses `em` instead of pixel measurements
  * Separated HTML, JavaScript, and CSS code

### Reference <a name="ref"></a>

* Maps URL
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

<p><br/></p>

&raquo; Back to [Album](./index.html)｜[Contents](#toc)｜[Home](../README.md)

<div style="display:none" markdown="0"><!--stylesheet-->
<style type="text/css"><!--
*, *::before, *::after {
  box-sizing: border-box;
}
a {
  text-decoration: none;
}
a:hover {
  color: darkred !important;
  text-decoration: none !important;
  background-color: lightyellow;
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
