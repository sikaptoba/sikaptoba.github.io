let dataJSON = {};

// ambil data json
fetch("data.json")
  .then(response => response.json())
  .then(data => {

    dataJSON = data;

    normalizeJadwalArrays(dataJSON.jadwalKapal);

    loadDropdown();

    tampilkanJadwal(dataJSON.jadwalKapal);

    // load safety gallery dynamically
    loadSafetyGallery();

  });


// ============================
// NORMALIZE JAM & HARI
// ============================
function normalizeJadwalArrays(jadwal){
  jadwal.forEach(item => {
    if (typeof item.jam === "string") {
      item.jam = [item.jam];
    } else if (!Array.isArray(item.jam)) {
      item.jam = [];
    }

    if (typeof item.hari === "string") {
      item.hari = [item.hari];
    } else if (!Array.isArray(item.hari)) {
      item.hari = [];
    }
  });
}


// ============================
// LOAD DROPDOWN
// ============================
// ============================
function loadDropdown(){

  const asalSelect = document.getElementById("asal");
  const tujuanSelect = document.getElementById("tujuan");
  const penumpangSelect = document.getElementById("penumpang");

  // pelabuhan asal
  dataJSON.pelabuhan.forEach(item => {

    asalSelect.innerHTML += `
      <option value="${item}">
        ${item}
      </option>
    `;

    tujuanSelect.innerHTML += `
      <option value="${item}">
        ${item}
      </option>
    `;

  });

  // jenis penumpang
  dataJSON.jenisPenumpang.forEach(item => {

    penumpangSelect.innerHTML += `
      <option value="${item}">
        ${item}
      </option>
    `;

  });

}


// ============================
// TAMPILKAN JADWAL
// ============================
function tampilkanJadwal(data){

  const tbody = document.getElementById("jadwalBody");

  tbody.innerHTML = "";

  if(data.length === 0){

    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;">
          Jadwal tidak ditemukan
        </td>
      </tr>
    `;

    updateStats(data);
    return;
  }

  data.forEach(item => {

    tbody.innerHTML += `
      <tr>
        <td>${Array.isArray(item.hari) ? item.hari.join(", ") : item.hari}</td>
        <td>${item.namaKapal}</td>
        <td>${item.asal} → ${item.tujuan}</td>
        <td>${Array.isArray(item.jam) ? item.jam.join(", ") : item.jam}</td>
        <td>${item.penumpang.join(", ")}</td>
      </tr>
    `;

  });

  updateStats(data);
}

function updateStats(data){
  const totalJadwal = data.length;
  const totalRute = new Set(data.map(item => `${item.asal} → ${item.tujuan}`)).size;
  const totalPelabuhan = dataJSON.pelabuhan.length;

  document.getElementById("totalJadwal").textContent = totalJadwal;
  document.getElementById("totalRute").textContent = totalRute;
  document.getElementById("totalPelabuhan").textContent = totalPelabuhan;
}


// ============================
// SAFETY GALLERY (dynamic)
// ============================
function loadSafetyGallery(){
  const galleryEl = document.getElementById('galleryScroll');
  if(!galleryEl) return;

  // try to load a manifest file listing images
  fetch('img/info-keselamatan/list.json')
    .then(resp => {
      if(!resp.ok) throw new Error('No manifest');
      return resp.json();
    })
    .then(list => renderSafetyGallery(list))
    .catch(() => {
      // manifest not available — try fetching directory index HTML (if server exposes it)
      fetch('img/info-keselamatan/')
        .then(r => {
          if(!r.ok) throw new Error('No dir listing');
          return r.text();
        })
        .then(html => {
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const anchors = Array.from(doc.querySelectorAll('a'));
            const images = anchors
              .map(a => a.getAttribute('href'))
              .filter(h => h && /\.(png|jpe?g|gif|webp)$/i.test(h))
              .map(h => h.replace(/^\.\/|^\//, ''));

            if(images.length) return renderSafetyGallery(images);
            throw new Error('No images in dir listing');
          } catch (e) {
            throw e;
          }
        })
        .catch(() => {
          // final fallback to common filenames
          const fallback = ['info.png', 'Gemini_Generated_Image_dri9kzdri9kzdri9.png'];
          renderSafetyGallery(fallback);
        });
    });
}

function renderSafetyGallery(list){
  const galleryEl = document.getElementById('galleryScroll');
  if(!galleryEl) return;
  galleryEl.innerHTML = '';

  list.forEach(filename => {
    if(!filename) return;
    const item = document.createElement('div');
    item.className = 'gallery-item';
    const img = document.createElement('img');
    // if filename is already a path, use it, otherwise prefix folder
    img.src = /\//.test(filename) ? filename : `img/info-keselamatan/${filename}`;
    img.alt = 'Poster Keselamatan';
    item.appendChild(img);
    galleryEl.appendChild(item);
  });
}


// ============================
// FILTER JADWAL
// ============================
function filterJadwal(){

  const asal = document.getElementById("asal").value;
  const tujuan = document.getElementById("tujuan").value;
  const penumpang = document.getElementById("penumpang").value;

  const hasil = dataJSON.jadwalKapal.filter(item =>

    item.asal === asal &&
    item.tujuan === tujuan &&
    item.penumpang.includes(penumpang)

  );

  tampilkanJadwal(hasil);

}