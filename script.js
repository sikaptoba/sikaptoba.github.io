let dataJSON = {};

// URL Web App Google Apps Script (…/exec). Kosongkan/biarkan placeholder
// untuk memakai data.json lokal sebagai cadangan.
const API_URL =
  "https://script.google.com/macros/s/AKfycbyu6ysWVaKuiL1HyOdM43xYE826qDkhLzCSZwCXyNSpINPXyyJ6cr-e8dBj0cbyBm_MoA/exec";

// ambil data: coba API dulu, jika belum diisi / gagal -> fallback data.json
function ambilData() {
  const pakaiApi = /^https?:\/\//.test(API_URL);
  const sumber = pakaiApi ? API_URL : "data.json";

  return fetch(sumber)
    .then((response) => {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .catch((err) => {
      if (pakaiApi) {
        console.warn("Gagal ambil dari API, memakai data.json:", err);
        return fetch("data.json").then((r) => r.json());
      }
      throw err;
    });
}

setState("loading");

ambilData()
  .then((data) => {
    dataJSON = data;

    normalizeJadwalArrays(dataJSON.jadwal);

    loadDropdown();

    tampilkanJadwal(dataJSON.jadwal);

    setState("ready");

    // load safety gallery dynamically
    loadSafetyGallery();
  })
  .catch((err) => {
    console.error("Gagal memuat jadwal:", err);
    setState("error", err && err.message);
  });

// ============================
// STATE UI: loading / error / siap
// ============================
function setState(state, msg) {
  const loading = document.getElementById("stateLoading");
  const error = document.getElementById("stateError");
  const table = document.getElementById("tableWrap");

  loading.hidden = state !== "loading";
  error.hidden = state !== "error";
  table.hidden = state !== "ready";

  if (state === "error" && msg) {
    document.getElementById("stateErrorMsg").textContent =
      "Gagal memuat data (" + msg + "). Periksa koneksi lalu coba lagi.";
  }
}

// ============================
// NORMALIZE JADWAL
// ============================
function normalizeJadwalArrays(jadwal) {
  (jadwal || []).forEach((item) => {
    item.jam = toArray(item.jam);
    item.penumpang = toArray(item.penumpang);

    if (!Array.isArray(item.kapal)) {
      item.kapal = item.kapal ? [item.kapal] : [];
    }
    // pastikan tiap kapal berupa objek {nama, hari, keterangan}
    item.kapal = item.kapal.map((k) =>
      typeof k === "string" ? { nama: k, hari: "", keterangan: "" } : k,
    );
  });
}

function toArray(v) {
  if (Array.isArray(v)) return v;
  if (v === null || v === undefined || v === "") return [];
  return [v];
}

// ============================
// LOAD DROPDOWN
// ============================
// ============================
function loadDropdown() {
  const asalSelect = document.getElementById("asal");
  const tujuanSelect = document.getElementById("tujuan");
  const penumpangSelect = document.getElementById("penumpang");

  // opsi "Semua" (value kosong = tanpa filter)
  asalSelect.innerHTML = `<option value="">Semua Dermaga</option>`;
  tujuanSelect.innerHTML = `<option value="">Semua Dermaga</option>`;
  penumpangSelect.innerHTML = `<option value="">Semua</option>`;

  // dermaga asal & tujuan
  (dataJSON.dermaga || []).forEach((item) => {
    asalSelect.innerHTML += `<option value="${item}">${item}</option>`;
    tujuanSelect.innerHTML += `<option value="${item}">${item}</option>`;
  });

  // jenis penumpang
  (dataJSON.jenisPenumpang || []).forEach((item) => {
    penumpangSelect.innerHTML += `<option value="${item}">${item}</option>`;
  });
}

// ============================
// TAMPILKAN JADWAL
// ============================
function tampilkanJadwal(data, hariAktif = "") {
  const tbody = document.getElementById("jadwalBody");
  const count = document.getElementById("resultCount");

  count.textContent =
    data.length + " keberangkatan" + (hariAktif ? ` · ${hariAktif}` : "");
  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="4">Tidak ada jadwal yang cocok dengan pencarian.</td>
      </tr>`;
    updateStats(data);
    return;
  }

  tbody.innerHTML = data
    .map((item) => {
      const arah = item.arah || "";
      const arahBadge = arah
        ? `<span class="arah-badge arah-${esc(arah)}">${esc(arah)}</span>`
        : "";
      const catatan = item.catatan
        ? `<div class="catatan">${esc(item.catatan)}</div>`
        : "";

      // chip kapal + badge hari (berwarna per hari)
      // bila ada filter tanggal aktif, kapal yang tak beroperasi hari itu dipudarkan (bukan disembunyikan)
      const kapal =
        (item.kapal || [])
          .map((k) => {
            const hari = k.hari
              ? `<span class="hari-badge hari-${hariClass(k.hari)}">${esc(k.hari)}</span>`
              : "";
            const muted = !kapalBeroperasi(k, hariAktif) ? " chip-muted" : "";
            return `<span class="kapal-chip${muted}">${esc(k.nama)}${hari}</span>`;
          })
          .join("") || "-";

      const jam =
        (item.jam || [])
          .map((j) => `<span class="jam-chip">${esc(j)}</span>`)
          .join(" ") || "-";

      const pnp =
        (item.penumpang || [])
          .map((p) => `<span class="pnp-chip">${esc(p)}</span>`)
          .join(" ") || "-";

      return `
        <tr>
          <td>
            <div class="rute-cell">
              ${arahBadge}
              <div class="rute-path"><span>${esc(item.asal)}</span><span class="arrow">→</span><span>${esc(item.tujuan)}</span></div>
              ${catatan}
            </div>
          </td>
          <td><div class="chips">${kapal}</div></td>
          <td><div class="chips">${jam}</div></td>
          <td><div class="chips">${pnp}</div></td>
        </tr>`;
    })
    .join("");

  updateStats(data);
}

// hindari HTML injection & bikin nama class hari dari teks
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function hariClass(h) {
  return String(h)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-");
}

function updateStats(data) {
  const totalJadwal = data.length;
  // rute tak berarah: "A ⇄ B" == "B ⇄ A"
  const totalRute = new Set(
    data.map((item) => [item.asal, item.tujuan].sort().join(" ⇄ ")),
  ).size;
  const totalPelabuhan = (dataJSON.dermaga || []).length;

  document.getElementById("totalJadwal").textContent = totalJadwal;
  document.getElementById("totalRute").textContent = totalRute;
  document.getElementById("totalPelabuhan").textContent = totalPelabuhan;
}

// ============================
// RESET FILTER
// ============================
function resetFilter() {
  document.getElementById("asal").value = "";
  document.getElementById("tujuan").value = "";
  document.getElementById("penumpang").value = "";
  const tgl = document.getElementById("tanggal");
  if (tgl) tgl.value = "";
  const hint = document.getElementById("hariHint");
  if (hint) hint.textContent = "";
  tampilkanJadwal(dataJSON.jadwal);
}

// ============================
// SAFETY GALLERY (dynamic)
// ============================
function loadSafetyGallery() {
  const galleryEl = document.getElementById("galleryScroll");
  if (!galleryEl) return;

  // try to load a manifest file listing images
  fetch("img/info-keselamatan-toba/list.json")
    .then((resp) => {
      if (!resp.ok) throw new Error("No manifest");
      return resp.json();
    })
    .then((list) => renderSafetyGallery(list))
    .catch(() => {
      // manifest not available — try fetching directory index HTML (if server exposes it)
      fetch("img/info-keselamatan-toba/")
        .then((r) => {
          if (!r.ok) throw new Error("No dir listing");
          return r.text();
        })
        .then((html) => {
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            const anchors = Array.from(doc.querySelectorAll("a"));
            const images = anchors
              .map((a) => a.getAttribute("href"))
              .filter((h) => h && /\.(png|jpe?g|gif|webp)$/i.test(h))
              .map((h) => h.replace(/^\.\/|^\//, ""));

            if (images.length) return renderSafetyGallery(images);
            throw new Error("No images in dir listing");
          } catch (e) {
            throw e;
          }
        })
        .catch(() => {
          // final fallback to common filenames
          const fallback = [
            "info.png",
            "Gemini_Generated_Image_dri9kzdri9kzdri9.png",
          ];
          renderSafetyGallery(fallback);
        });
    });
}

function renderSafetyGallery(list) {
  const galleryEl = document.getElementById("galleryScroll");
  if (!galleryEl) return;
  galleryEl.innerHTML = "";

  // create a single stacked container of images (one scroll area)
  const stack = document.createElement("div");
  stack.className = "gallery-stack";

  list.forEach((filename) => {
    if (!filename) return;
    const img = document.createElement("img");
    img.className = "gallery-image";
    img.src = /\//.test(filename)
      ? filename
      : `img/info-keselamatan-toba/${filename}`;
    img.alt = "Poster Keselamatan";
    stack.appendChild(img);
  });

  galleryEl.appendChild(stack);
}

// ============================
// FILTER JADWAL
// ============================
const HARI_ID = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

// "2026-07-08" -> "Rabu". Dibangun manual (bukan `new Date(string)`) supaya
// tidak digeser timezone dan selalu dihitung sebagai tengah malam waktu lokal.
function hariDariTanggal(tanggal) {
  if (!tanggal) return "";
  const [y, m, d] = tanggal.split("-").map(Number);
  if (!y || !m || !d) return "";
  return HARI_ID[new Date(y, m - 1, d).getDay()];
}

// kapal ini beroperasi pada `hari` tertentu? (kosong/"Setiap Hari" = selalu jalan)
// kolom "hari" boleh berisi lebih dari 1 hari, dipisah koma, mis. "Senin, Kamis"
function kapalBeroperasi(kapal, hari) {
  if (!hari || !kapal.hari) return true;
  if (kapal.hari === "Setiap Hari") return true;
  return kapal.hari
    .split(",")
    .map((h) => h.trim())
    .includes(hari);
}

function filterJadwal() {
  const asal = document.getElementById("asal").value;
  const tujuan = document.getElementById("tujuan").value;
  const penumpang = document.getElementById("penumpang").value;
  const tanggal = document.getElementById("tanggal").value;
  const hari = hariDariTanggal(tanggal);

  const hint = document.getElementById("hariHint");
  if (hint) {
    hint.textContent = hari ? `Menampilkan jadwal untuk hari ${hari}` : "";
  }

  const hasil = dataJSON.jadwal.filter(
    (item) =>
      (asal === "" || item.asal === asal) &&
      (tujuan === "" || item.tujuan === tujuan) &&
      (penumpang === "" || item.penumpang.includes(penumpang)) &&
      (hari === "" || item.kapal.some((k) => kapalBeroperasi(k, hari))),
  );

  tampilkanJadwal(hasil, hari);
}
