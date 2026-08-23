const images = [
  "shiji-by-form.png",
  "shiji-by-formwords.png",
  "shiji-by-category.png",
  "shiji-by-decade.png",
  "shiji-by-seasons.png",
  "shiji-by-months.png",
  "shiji-by-catwords.png",
  "shiji-by-location.png"
];
const _class = 'class="half"';
const _aview = 'target="_view"';
const elem = document.getElementById("charts");
elem.innerHTML = images
  .map(p => `<a href="${p}" ${_aview}><img src="${p}" ${_class}></a>`)
  .join("");
