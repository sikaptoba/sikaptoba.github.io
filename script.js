let dataJSON = {};

// ambil data json
fetch("data.json")
  .then(response => response.json())
  .then(data => {

    dataJSON = data;

    normalizeJadwalJam(dataJSON.jadwalKapal);

    loadDropdown();

    tampilkanJadwal(dataJSON.jadwalKapal);

  });


// ============================
// NORMALIZE JAM
// ============================
function normalizeJadwalJam(jadwal){
  jadwal.forEach(item => {
    if (typeof item.jam === "string") {
      item.jam = [item.jam];
    } else if (!Array.isArray(item.jam)) {
      item.jam = [];
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

    return;
  }

  data.forEach(item => {

    tbody.innerHTML += `
      <tr>
        <td>${item.hari}</td>
        <td>${item.namaKapal}</td>
        <td>${item.asal} → ${item.tujuan}</td>
        <td>${Array.isArray(item.jam) ? item.jam.join(", ") : item.jam}</td>
        <td>${item.penumpang.join(", ")}</td>
      </tr>
    `;

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