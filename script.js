import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  onValue,
  get,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBB6Su0uhNcKKoq9Qa_-RGb6cAZOmV2u-U",
  authDomain: "badminton2kalah.firebaseapp.com",
  databaseURL:
    "https://badminton2kalah-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "badminton2kalah",
  appId: "1:65294297294:web:1664f68c4ffda101cf489f",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dbRef = ref(db, "tournament_data");

window.isAdminMode = false;
window.teamNames = {};

window.checkPersistentAdmin = () => {
  if (localStorage.getItem("adminStatus") === "active") {
    window.isAdminMode = true;
    document
      .querySelectorAll(".admin-only")
      .forEach((el) => (el.style.display = "flex"));
    document.getElementById("authSection").style.display = "none";
    setTimeout(() => {
      populatePesertaInputs();
      updatePesertaInputDisplay();
    }, 200);
  }
};

// Modified: Admin panel sekarang menampilkan 16 pemain individually (1-16), bukan 8 matches
function populatePesertaInputs() {
  const section = document.getElementById("pesertaInputSection");
  if (!section || section.children.length > 0) return; // Jika dah ada input, jangan overwrite

  section.innerHTML = "";

  for (let i = 0; i < 16; i++) {
    const groupDiv = document.createElement("div");
    groupDiv.className = "peserta-input-group";

    // Kita hanya ambil data awal dari Firebase jika ada
    let initialNama =
      window.teamNames && window.teamNames[i] ? window.teamNames[i].nama : "";
    let initialAv =
      window.teamNames && window.teamNames[i] ? window.teamNames[i].avatar : "";

    groupDiv.innerHTML = `
            <label>INPUT SLOT ${i + 1}</label>
            <input type="number" id="admin_seed${i}" value="${i + 1}" min="1" max="16" placeholder="No Seed">
            <input type="text" id="admin_p${i}" value="${initialNama === "BYE" ? "" : initialNama}" placeholder="Nama Pasukan">
            <input type="text" id="admin_av${i}" value="${initialAv}" placeholder="Link Avatar URL">
        `;
    section.appendChild(groupDiv);
  }
}

function updatePesertaInputDisplay() {
  // Kita tidak mahu overwrite nombor seed yang sedang ditaip oleh admin
  if (document.activeElement.id.startsWith("admin_seed")) return;

  for (let i = 0; i < 16; i++) {
    const pInput = document.getElementById(`admin_p${i}`);
    const pAvatarInput = document.getElementById(`admin_av${i}`);
    const seedInput = document.getElementById(`admin_seed${i}`);

    // Kita kekalkan nilai sedia ada dalam input jika sedang aktif
    if (pInput && document.activeElement !== pInput) {
      // Logik paparan kekal mengikut slot fizikal input tersebut
      // Data pasukan akan diambil berdasarkan nilai seed yang ada dalam input itu sekarang
      const currentSeed = parseInt(seedInput.value);
      if (!isNaN(currentSeed)) {
        const teamData = window.teamNames[currentSeed - 1] || {
          nama: "BYE",
          avatar: "",
        };
        pInput.value = teamData.nama === "BYE" ? "" : teamData.nama;
        pAvatarInput.value = teamData.avatar || "";
      }
    }
  }
}

window.syncPesertaInput = (seedIndex, value, field) => {
  if (!window.teamNames[seedIndex]) {
    window.teamNames[seedIndex] = { nama: "", avatar: "" };
  }
  window.teamNames[seedIndex][field] = value;
};

window.checkAuth = () => {
  if (document.getElementById("passInput").value === "admin123") {
    localStorage.setItem("adminStatus", "active");
    window.isAdminMode = true;
    document.body.classList.add("admin-active");
    document
      .querySelectorAll(".admin-only")
      .forEach((el) => (el.style.display = "flex"));
    document.getElementById("authSection").style.display = "none";
    setTimeout(() => {
      populatePesertaInputs();
      updatePesertaInputDisplay();
    }, 100);
  } else {
    alert("Salah!");
  }
};

window.logoutAdmin = () => {
  localStorage.removeItem("adminStatus");
  document.body.classList.remove("admin-active");
  location.reload();
};
window.toggleAdmin = () => {
  const p = document.getElementById("panelAdmin");
  p.style.display = p.style.display === "block" ? "none" : "block";
};

// --- CARI DAN GANTI BLOK INI DI BAHAGIAN PALING BAWAH script.js ---

// --- GANTI BLOK onValue ANDA DENGAN INI ---

onValue(dbRef, (snapshot) => {
  const data = snapshot.val() || {}; // Gunakan objek kosong jika data null

  // Pastikan teamNames sentiasa ada data asas
  window.teamNames = data.teams || {};

  // SEMAK: Adakah kursor sedang berada dalam kotak input?
  const sedangFokus = document.activeElement.tagName === "INPUT";

  // Lukis semula bracket walaupun data.teams kosong
  if (!sedangFokus) {
    // Hantar data kosong ( {} ) jika data belum wujud di Firebase
    jana(data.scores || {}, data.matchLabels || {}, data.roundSequence || {});
  }

  window.updateMatchHighlights();
});

window.saveAll = () => {
  const inputSection = document.getElementById("pesertaInputSection");
  if (!inputSection || inputSection.children.length === 0) return;

  let teams = {};
  let usedSeeds = new Set();
  let hasConflict = false;

  // 1. Kumpul data Peserta/Team
  for (let i = 0; i < 16; i++) {
    const seedInput = document.getElementById(`admin_seed${i}`);
    const pInput = document.getElementById(`admin_p${i}`);
    const pAvatarInput = document.getElementById(`admin_av${i}`);

    if (seedInput) {
      const seedValue = seedInput.value.trim();
      if (seedValue === "") continue;

      const seedNum = parseInt(seedValue);

      if (seedNum < 1 || seedNum > 16) {
        alert(`Slot ${i + 1}: Sila guna nombor seed antara 1-16.`);
        seedInput.value = "";
        continue;
      }

      if (usedSeeds.has(seedNum)) {
        alert(
          `Ralat: Nombor Seed ${seedNum} sudah digunakan! Sila guna nombor lain.`,
        );
        seedInput.value = "";
        hasConflict = true;
        continue;
      }

      usedSeeds.add(seedNum);
      const namaValue = pInput.value.trim();

      teams[seedNum - 1] = {
        nama: namaValue === "" ? "BYE" : namaValue,
        avatar: pAvatarInput.value.trim(),
      };
    }
  }

  if (hasConflict) return;

  for (let j = 0; j < 16; j++) {
    if (!teams[j]) teams[j] = { nama: "BYE", avatar: "" };
  }

  // 2. Kumpul data Skor
  let scores = {};
  document.querySelectorAll(".skor").forEach((s) => {
    if (s.value !== "") scores[s.id] = s.value;
  });

  // 3. Kumpul data Label Match (P1, P2, dll)
  let matchLabels = {};
  document.querySelectorAll(".match-top-input").forEach((mi) => {
    if (mi.value && mi.value.trim() !== "")
      matchLabels[mi.id] = mi.value.trim();
  });

  // --- BAHAGIAN BARU: Kumpul data Urutan Pusingan (Kotak P) ---
  let roundSequence = {};
  document.querySelectorAll(".round-seq-input").forEach((inp) => {
    if (inp.value !== "") {
      // Ambil rId (contoh: W_0) daripada ID input (contoh: seq_W_0)
      let rId = inp.id.replace("seq_", "");
      roundSequence[rId] = inp.value;
    }
  });

  // 4. Simpan SEMUA ke Firebase (Termasuk roundSequence)
  set(dbRef, {
    n: 16,
    teams: teams,
    scores: scores,
    matchLabels: matchLabels,
    roundSequence: roundSequence, // Simpan nombor highlight di sini
  })
    .then(() => {
      const toast = document.getElementById("syncToast");
      if (toast) {
        toast.style.opacity = "1";
        setTimeout(() => {
          toast.style.opacity = "0";
        }, 2000);
      }
      // Selepas simpan, terus update highlight
      window.updateMatchHighlights();
    })
    .catch((err) => alert("Gagal simpan: " + err));
};

window.resetSkor = async () => {
  // Mesej amaran yang lebih jelas
  if (
    confirm(
      "Reset semua skor sahaja? Nama Peserta, Nombor Match dan Sequence (P) akan DIKEKALKAN.",
    )
  ) {
    try {
      // 1. Ambil data terkini dari Firebase dahulu
      const snapshot = await get(dbRef);
      const data = snapshot.val() || {};

      // 2. Hantar semula data, tetapi kosongkan bahagian 'scores' sahaja
      // Kita kekalkan teams, matchLabels, dan roundSequence
      await set(dbRef, {
        n: 16,
        teams: data.teams || {},
        matchLabels: data.matchLabels || {},
        roundSequence: data.roundSequence || {}, // Ini untuk kekalkan P1, P2 dsb
        scores: {}, // Skor disetkan kepada kosong
      });

      alert("Skor berjaya di-reset. Data lain dikekalkan.");
      location.reload();
    } catch (error) {
      console.error("Ralat reset skor:", error);
      alert("Gagal reset skor. Sila semak sambungan internet atau console.");
    }
  }
};

window.resetTournament = () => {
  if (
    confirm(
      "Reset semua data? Ini akan memadam SEMUA Nama, Skor dan Nombor Match.",
    )
  ) {
    set(dbRef, {
      n: 16,
      teams: {},
      scores: {},
      matchLabels: {},
      roundSequence: {},
    }).then(() => location.reload());
  }
};

// Modified: Match numbers now display as P1-P8 instead of 1-8
function createBox(j, r, m, matchNum) {
  let id = `${j}_${r}_${m}`;
  const wrapper = document.createElement("div");
  wrapper.className = "match-wrapper";

  let box = document.createElement("div");
  box.className = "kotak-perlawanan";
  box.id = id;

  // Tentukan label secara automatik atau manual
  let matchValue = "";
  if (j === "GF") matchValue = "P30 GRAND FINAL";
  else if (j === "L" && r === 5) matchValue = "P29 FINAL LOSER";
  else {
    // Jika anda mahu ia tunjuk P1, P2 secara automatik mengikut matchNum:
    matchValue = `P${matchNum}`;
  }

  // TAMBAH 'disabled' pada input match-top-input
  box.innerHTML = `
        <input type="text" class="match-top-input" id="${id}_label" value="${matchValue}" disabled />
        <div class="slot-pasukan" id="${id}_s1">
            <span class="seed-no" id="${id}_sd1" style="display:none"></span>
            <div class="avatar" id="${id}_av1"></div>
            <input type="text" class="nama-display" id="${id}_p1" placeholder="..." readonly>
            <input type="text" class="skor" id="${id}_sc1" oninput="window.kira('${id}')" placeholder="0">
        </div>
        <div class="slot-pasukan" id="${id}_s2">
            <span class="seed-no" id="${id}_sd2" style="display:none"></span>
            <div class="avatar" id="${id}_av2"></div>
            <input type="text" class="nama-display" id="${id}_p2" placeholder="..." readonly>
            <input type="text" class="skor" id="${id}_sc2" oninput="window.kira('${id}')" placeholder="0">
        </div>`;

  wrapper.appendChild(box);
  return wrapper;
}

function getAvatarColor(nama) {
  const colors = [
    "#667eea",
    "#764ba2",
    "#f093fb",
    "#4facfe",
    "#00f2fe",
    "#43e97b",
    "#fa709a",
    "#fee140",
    "#30cfd0",
    "#330867",
    "#eb3349",
    "#f45c43",
    "#fa7e1e",
    "#d946ef",
    "#0369a1",
    "#06b6d4",
  ];
  if (!nama || nama === "BYE" || nama === "...") return "#666";
  let hash = 0;
  for (let i = 0; i < nama.length; i++) {
    hash = (hash << 5) - hash + nama.charCodeAt(i);
    hash = hash & hash;
  }
  return colors[Math.abs(hash) % colors.length];
}

function getAvatarInitials(nama) {
  if (!nama || nama === "BYE" || nama === "...") return "BYE";
  const parts = nama.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return nama.substring(0, 2).toUpperCase();
}

function updateAvatar(id, slot, nama, avatarUrl) {
  const avEl =
    id === "pod"
      ? document.getElementById(`pod_av${slot}`)
      : document.getElementById(`${id}_av${slot}`);
  if (!avEl) return;

  // Jika ada avatar URL, gunakan sebagai background image
  if (avatarUrl && avatarUrl.trim() !== "") {
    avEl.style.backgroundImage = `url('${avatarUrl}')`;
    avEl.style.backgroundSize = "cover";
    avEl.style.backgroundPosition = "center";
    avEl.innerText = "";
    avEl.style.color = "transparent";
  } else {
    // Jika tiada avatar URL, gunakan inisial
    avEl.style.backgroundImage = "none";
    avEl.innerText = getAvatarInitials(nama);
    avEl.style.color = "#fff";
    const color = getAvatarColor(nama);
    avEl.style.background =
      nama === "BYE" || !nama || nama === "..."
        ? "#666"
        : `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`;
  }

  if (nama === "BYE" || !nama || nama === "...") {
    avEl.classList.add("bye-avatar");
  } else {
    avEl.classList.remove("bye-avatar");
  }
}

function jana(savedScores, savedMatchLabels, savedRoundSequence) {
  const bw = document.getElementById("barisW");
  const bl = document.getElementById("barisL");
  const podiumClone = document.getElementById("podiumFinal");

  bw.innerHTML = '<div class="label-bracket">Winner Bracket (Upper)</div>';
  bl.innerHTML = '<div class="label-bracket">Loser Bracket (Lower)</div>';
  bw.appendChild(podiumClone);

  // --- 1. WINNER BRACKET (4 ROUNDS) ---
  let winMatchOffsets = [1, 9, 13, 15];
  for (let r = 0; r < 4; r++) {
    let div = document.createElement("div");
    div.className = "pusingan";

    // TAMBAH INPUT SEQUENCE DI SINI
    let rId = `W_${r}`;
    let seqInput = document.createElement("input");
    seqInput.type = "number";
    seqInput.className = "round-seq-input admin-only";
    seqInput.id = `seq_${rId}`;
    seqInput.placeholder = "P";
    // Cuba dapatkan nilai sedia ada dari Firebase
    get(ref(db, `tournament_data/roundSequence/${rId}`)).then((s) => {
      if (s.exists()) seqInput.value = s.val();
    });
    seqInput.onchange = (e) =>
      set(ref(db, `tournament_data/roundSequence/${rId}`), e.target.value);
    div.appendChild(seqInput);

    for (let m = 0; m < Math.pow(2, 3 - r); m++) {
      div.appendChild(createBox("W", r, m, winMatchOffsets[r] + m));
    }
    bw.appendChild(div);
  }

  // --- 2. GRAND FINAL ---
  let divGF = document.createElement("div");
  divGF.className = "pusingan";
  let gfWrapper = createBox("GF", 0, 0, 30);
  gfWrapper.querySelector(".kotak-perlawanan").classList.add("grand-final");
  divGF.appendChild(gfWrapper);
  bw.appendChild(divGF);

  // --- 3. LOSER BRACKET (6 ROUNDS) ---
  const loserMatchesCount = [4, 4, 2, 2, 1, 1];
  let losMatchOffsets = [16, 20, 24, 26, 28, 29];
  for (let r = 0; r < 6; r++) {
    let div = document.createElement("div");
    div.className = "pusingan";

    // TAMBAH INPUT SEQUENCE DI SINI
    let rId = `L_${r}`;
    let seqInput = document.createElement("input");
    seqInput.type = "number";
    seqInput.className = "round-seq-input admin-only";
    seqInput.id = `seq_${rId}`;
    seqInput.placeholder = "P";
    get(ref(db, `tournament_data/roundSequence/${rId}`)).then((s) => {
      if (s.exists()) seqInput.value = s.val();
    });
    seqInput.onchange = (e) =>
      set(ref(db, `tournament_data/roundSequence/${rId}`), e.target.value);
    div.appendChild(seqInput);

    for (let m = 0; m < loserMatchesCount[r]; m++) {
      let matchNum = losMatchOffsets[r] + m;
      let box = createBox("L", r, m, matchNum);
      if (r === 5) box.classList.add("loser-final-highlight");
      div.appendChild(box);
    }
    bl.appendChild(div);
  }

  const seeds = [0, 15, 7, 8, 3, 12, 4, 11, 1, 14, 6, 9, 2, 13, 5, 10];
  for (let m = 0; m < 8; m++) {
    updateSlot(
      `W_0_${m}`,
      1,
      window.teamNames[seeds[m * 2]]?.nama || "",
      seeds[m * 2],
    );
    updateSlot(
      `W_0_${m}`,
      2,
      window.teamNames[seeds[m * 2 + 1]]?.nama || "",
      seeds[m * 2 + 1],
    );
  }

  for (let id in savedScores) {
    const input = document.getElementById(id);
    if (input) input.value = savedScores[id];
  }

  // restore match-top labels if any
  for (let id in savedMatchLabels || {}) {
    const el = document.getElementById(id);
    if (el) el.value = savedMatchLabels[id];
  }

  const flow = [
    "W_0",
    "W_1",
    "W_2",
    "W_3",
    "L_0",
    "L_1",
    "L_2",
    "L_3",
    "L_4",
    "L_5",
    "GF_0",
  ];
  flow.forEach((f) => {
    document.querySelectorAll(`[id^="${f}_"]`).forEach((box) => {
      if (box.classList.contains("kotak-perlawanan")) window.kira(box.id);
    });
  });
  autoBye();
  penyelarasanLebar();

  // --- Letakkan ini di bahagian paling bawah dalam fungsi jana() ---

  // 1. Kunci SEMUA nama dalam bracket (Winner/Loser/GF)
  document.querySelectorAll(".nama-display").forEach((el) => {
    el.readOnly = true;
    el.style.pointerEvents = "none"; // Halang klik terus
    el.style.background = "transparent";
  });

  // 2. Kunci label Match (P1, P2, dll)
  document.querySelectorAll(".match-top-input").forEach((el) => {
    el.readOnly = true;
    el.style.pointerEvents = "none";
  });

  // 3. Kawalan Input Skor - Hanya kunci jika bukan admin
  document.querySelectorAll(".skor").forEach((el) => {
    if (!window.isAdminMode) {
      el.readOnly = true;
      el.style.pointerEvents = "none";
      el.style.border = "none";
    } else {
      // Biarkan CSS kawal melalui body.admin-active
      el.style.removeProperty('pointer-events');
      el.style.removeProperty('border');
    }
  });

  // 4. Input Nama di Panel Admin (Hanya ini yang boleh diedit oleh Admin)
  if (window.isAdminMode) {
    document.querySelectorAll("#pesertaInputSection input").forEach((el) => {
      el.readOnly = false;
      el.style.pointerEvents = "auto";
    });
  }
}

// Modified: Seed-no now positioned OUTSIDE the slot-pasukan container (via CSS positioning)
function updateSlot(mid, slot, nama, pid) {
  const pEl = document.getElementById(`${mid}_p${slot}`);
  const sEl = document.getElementById(`${mid}_s${slot}`);
  const sdEl = document.getElementById(`${mid}_sd${slot}`);
  if (pEl) pEl.value = nama;
  if (sEl) sEl.setAttribute("data-pid", pid);

  const avatarUrl =
    window.teamNames && window.teamNames[pid]
      ? window.teamNames[pid].avatar || ""
      : "";
  updateAvatar(mid, slot, nama, avatarUrl);

  // Seed-no display logic - hanya untuk round pertama winner bracket
  if (sdEl && mid.startsWith("W_0_")) {
    sdEl.innerText = (parseInt(pid) + 1).toString().padStart(2, "0");
    sdEl.style.display = "flex";
  } else if (sdEl) {
    sdEl.style.display = "none";
  }
}

function updatePathSoftColors(nama, cssClass) {
  if (!nama || nama === "BYE" || nama === "...") return;
  document.querySelectorAll(".slot-pasukan").forEach((slot) => {
    if (slot.querySelector(".nama-display").value === nama) {
      slot.classList.remove("path-emas", "path-perak", "path-gangsa");
      slot.classList.add(cssClass);
    }
  });
}

// Flag untuk elak recursive calls
let isProcessingKira = false;

window.kira = (id) => {
  // Elak recursive calls
  if (isProcessingKira) return;
  isProcessingKira = true;
  
  try {
    let sc1 = document.getElementById(id + "_sc1").value;
    let sc2 = document.getElementById(id + "_sc2").value;
    const sl1 = document.getElementById(id + "_s1");
    const sl2 = document.getElementById(id + "_s2");
    const box = document.getElementById(id); // Ambil elemen kotak perlawanan

    const p1 = document.getElementById(id + "_p1").value;
    const p2 = document.getElementById(id + "_p2").value;

    // --- LOGIK MERAH BERKELIP (EFEK BELUM SELESAI) ---
    // Jika skor kosong ATAU kedua-duanya 0, tambah class merah.
    // Kecuali jika kedua-duanya BYE (biasanya auto-complete).
    if (
      (sc1 === "" ||
        sc2 === "" ||
        (parseInt(sc1) === 0 && parseInt(sc2) === 0)) &&
      !(p1 === "BYE" && p2 === "BYE")
    ) {
      box.classList.add("kotak-belum-selesai");
    } else {
      box.classList.remove("kotak-belum-selesai");
    }

    // 1. Validasi Input
    if (sc1 === "" || sc2 === "") return;
    if (sc1 === sc2 && !(p1 === "BYE" && p2 === "BYE")) return;

    // 2. Tentukan Pemenang
    let win =
      p1 === "BYE" && p2 === "BYE" ? 1 : parseInt(sc1) > parseInt(sc2) ? 1 : 2;

    sl1.classList.toggle("pemenang", win === 1);
    sl2.classList.toggle("pemenang", win === 2);

    let winN = document.getElementById(`${id}_p${win}`).value;
    let winP = document.getElementById(`${id}_s${win}`).getAttribute("data-pid");
    let losN = document.getElementById(`${id}_p${win === 1 ? 2 : 1}`).value;
    let losP = document
      .getElementById(`${id}_s${win === 1 ? 2 : 1}`)
      .getAttribute("data-pid");

    let p = id.split("_"),
      r = parseInt(p[1]),
      m = parseInt(p[2]);

    // 3. Logik Pergerakan Bracket (Winner & Loser)
    if (p[0] === "W") {
      let nextR = r + 1,
        nextM = Math.floor(m / 2),
        nextS = (m % 2) + 1;
      if (r < 3) updateSlot(`W_${nextR}_${nextM}`, nextS, winN, winP);
      else if (r === 3) updateSlot("GF_0_0", 1, winN, winP);

      if (r === 0)
        updateSlot(`L_0_${Math.floor(m / 2)}`, (m % 2) + 1, losN, losP);
      else if (r === 1) updateSlot(`L_1_${3 - m}`, 2, losN, losP);
      else if (r === 2) updateSlot(`L_3_${1 - m}`, 2, losN, losP);
      else if (r === 3) updateSlot("L_5_0", 2, losN, losP);
    } else if (p[0] === "L") {
      if (r < 5) {
        if (r % 2 === 0) updateSlot(`L_${r + 1}_${m}`, 1, winN, winP);
        else
          updateSlot(`L_${r + 1}_${Math.floor(m / 2)}`, (m % 2) + 1, winN, winP);
      } else {
        updateSlot("GF_0_0", 2, winN, winP);
      }
    }
    // 4. LOGIK PODIUM (GF) - HANYA UPDATE JIKA TOURNAMENT SELESAI
    else if (p[0] === "GF") {
      // Check jika tournament benar-benar selesai
      const w3Box = document.getElementById("W_3_0");
      const l5Box = document.getElementById("L_5_0");
      
      let tournamentSelesai = false;
      
      // Check jika final match ada skor
      const gfSc1 = document.getElementById("GF_0_0_sc1")?.value || "";
      const gfSc2 = document.getElementById("GF_0_0_sc2")?.value || "";
      
      if (gfSc1 !== "" && gfSc2 !== "" && gfSc1 !== gfSc2) {
        // Final selesai, check 3rd place match
        if (l5Box) {
          const l5Sc1 = document.getElementById("L_5_0_sc1")?.value || "";
          const l5Sc2 = document.getElementById("L_5_0_sc2")?.value || "";
          
          if (l5Sc1 !== "" && l5Sc2 !== "" && l5Sc1 !== l5Sc2) {
            tournamentSelesai = true;
          }
        } else {
          // Jika tiada 3rd place match, final saja cukup
          tournamentSelesai = true;
        }
      }
      
      // Update podium hanya jika tournament selesai
      if (tournamentSelesai) {
        const podium = document.getElementById("podiumFinal");
        if (podium) {
          podium.style.display = "block";
          const res1 = document.getElementById("res_1");
          if (res1) res1.innerText = winN;
          updateAvatar("pod", 1, winN, window.teamNames[winP]?.avatar || "");

          const res2 = document.getElementById("res_2");
          if (res2) res2.innerText = losN;
          updateAvatar("pod", 2, losN, window.teamNames[losP]?.avatar || "");

          // Update 3rd place
          if (l5Box) {
            const sL1 = document.getElementById("L_5_0_sc1").value;
            const sL2 = document.getElementById("L_5_0_sc2").value;
            if (sL1 !== "" && sL2 !== "") {
              const isWin1 = parseInt(sL1) > parseInt(sL2);
              const t3Nama = isWin1
                ? document.getElementById("L_5_0_p2").value
                : document.getElementById("L_5_0_p1").value;
              const t3Pid = isWin1
                ? document.getElementById("L_5_0_s2").getAttribute("data-pid")
                : document.getElementById("L_5_0_s1").getAttribute("data-pid");
              const res3 = document.getElementById("res_3");
              if (res3) res3.innerText = t3Nama;
              updateAvatar("pod", 3, t3Nama, window.teamNames[t3Pid]?.avatar || "");
            }
          }
        }
      }
    }

    autoBye();
    window.updateMatchHighlights();
  } finally {
    // Reset flag
    isProcessingKira = false;
  }
};

function autoBye() {
  const brackets = ["W", "L", "GF"];
  let adaPerubahan = false;

  brackets.forEach((type) => {
    document
      .querySelectorAll(`[id^="${type}_"].kotak-perlawanan`)
      .forEach((box) => {
        const id = box.id;
        const p1 = document.getElementById(id + "_p1").value;
        const p2 = document.getElementById(id + "_p2").value;
        const sc1 = document.getElementById(id + "_sc1");
        const sc2 = document.getElementById(id + "_sc2");

        // Proses hanya jika skor masih kosong
        if (sc1.value === "" && sc2.value === "") {
          // KES 1: Pemain vs BYE (Auto win hanya jika lawan BYE)
          if (p1 !== "" && p1 !== "BYE" && p1 !== "..." && p2 === "BYE") {
            sc1.value = 21;
            sc2.value = 0;
            // JANGAN panggil kira() dulu - tunggu pusingan selesai
            adaPerubahan = true;
          }
          // KES 2: BYE vs Pemain (Auto win hanya jika lawan BYE)
          else if (p1 === "BYE" && p2 !== "" && p2 !== "BYE" && p2 !== "...") {
            sc1.value = 0;
            sc2.value = 21;
            // JANGAN panggil kira() dulu - tunggu pusingan selesai
            adaPerubahan = true;
          }
          // KES 3: BYE vs BYE (Auto draw)
          else if (p1 === "BYE" && p2 === "BYE") {
            sc1.value = 0;
            sc2.value = 0;
            // JANGAN panggil kira() dulu - tunggu pusingan selesai
            adaPerubahan = true;
          }
          // JIKA LAWAN BELUM ADA → JANGAN AUTO-WIN
          // Biarkan kosong untuk menunggu lawan
        }
      });
  });

  // Jika ada perubahan, check jika pusingan selesai baru proses
  if (adaPerubahan) {
    setTimeout(() => {
      // Check semua match dalam pusingan aktif
      checkDanProsesPusinganSelesai();
    }, 100);
  }
}

// Fungsi baru: Check dan proses pusingan selesai
function checkDanProsesPusinganSelesai() {
  // Dapatkan pusingan aktif dari round sequence
  get(ref(db, "tournament_data/roundSequence")).then((snapshot) => {
    const sequences = snapshot.val() || {};
    
    // Susun pusingan ikut nombor
    const sortedRounds = Object.entries(sequences)
      .filter(([id, val]) => val !== "" && val !== null)
      .sort((a, b) => parseInt(a[1]) - parseInt(b[1]));

    for (let [roundId, seqNo] of sortedRounds) {
      const matchesInRound = document.querySelectorAll(
        `[id^="${roundId}_"].kotak-perlawanan`,
      );
      
      let pusinganSelesai = true;
      let matchIdsToProcess = [];

      matchesInRound.forEach((box) => {
        const sc1 = document.getElementById(box.id + "_sc1")?.value || "";
        const sc2 = document.getElementById(box.id + "_sc2")?.value || "";
        
        // Check jika match ada skor (termasuk auto-win)
        if (sc1 !== "" && sc2 !== "") {
          matchIdsToProcess.push(box.id);
        } else {
          // Masih ada match belum selesai
          pusinganSelesai = false;
        }
      });

      // Jika pusingan ini selesai, proses semua match
      if (pusinganSelesai && matchIdsToProcess.length > 0) {
        matchIdsToProcess.forEach(matchId => {
          window.kira(matchId);
        });
        break; // Proses satu pusingan pada satu masa
      }
    }
  });
}

// --- 2. PENYELARASAN LEBAR BRACKET ---
function penyelarasanLebar() {
  setTimeout(() => {
    const bw = document.getElementById("barisW");
    const bl = document.getElementById("barisL");
    if (!bw || !bl) return;
    bw.style.minWidth = "0";
    bl.style.minWidth = "0";
    const max = Math.max(bw.scrollWidth, bl.scrollWidth);
    bw.style.minWidth = max + "px";
    bl.style.minWidth = max + "px";
  }, 100);
}

// --- 3. SWAP NOMBOR SEED & AUTO-SAVE (GABUNG) ---
document.addEventListener("change", function (e) {
  // 1. Seed swap logic
  if (e.target && e.target.id.startsWith("admin_seed")) {
    let currentInput = e.target;
    let newValue = parseInt(currentInput.value);
    let oldValue =
      parseInt(currentInput.defaultValue) ||
      parseInt(currentInput.id.replace("admin_seed", "")) + 1;

    document.querySelectorAll('input[id^="admin_seed"]').forEach((input) => {
      if (input !== currentInput && parseInt(input.value) === newValue) {
        input.value = oldValue;
        input.defaultValue = oldValue;
      }
    });
    currentInput.defaultValue = newValue;
  }
  
  // 2. Auto-save logic (handleAutoSave)
  if (!window.isAdminMode) return;

  // Simpan jika yang berubah adalah skor, input admin, atau label match
  if (
    e.target.classList.contains("skor") ||
    e.target.classList.contains("admin-input") ||
    e.target.classList.contains("match-top-input")
  ) {
    // Tangguh save untuk tunggu proses kira selesai
    setTimeout(() => {
      console.log("Auto-saving data...");
      window.saveAll();
    }, 500); // Tangguh 500ms
  }
});

// Kesan tekan Enter
document.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && e.target.tagName === "INPUT") {
    e.target.blur(); // Trigger 'change' event di atas
  }
});
window.updateMatchHighlights = () => {
  get(ref(db, "tournament_data/roundSequence")).then((snapshot) => {
    const sequences = snapshot.val() || {};

    // 1. Susun pusingan ikut nombor Sequence (P1, P2...)
    const sortedRounds = Object.entries(sequences)
      .filter(([id, val]) => val !== "" && val !== null)
      .sort((a, b) => parseInt(a[1]) - parseInt(b[1]));

    let activeRoundId = null;

    // 2. Cari pusingan mana yang "Tengah Berjalan" sekarang
    for (let [roundId, seqNo] of sortedRounds) {
      const matchesInRound = document.querySelectorAll(
        `[id^="${roundId}_"].kotak-perlawanan`,
      );
      let adaMatchAktif = false;

      matchesInRound.forEach((box) => {
        const sc1 = document.getElementById(box.id + "_sc1")?.value || "";
        const sc2 = document.getElementById(box.id + "_sc2")?.value || "";
        const p1 = document.getElementById(box.id + "_p1")?.value || "";
        const p2 = document.getElementById(box.id + "_p2")?.value || "";
        
        // Check jika match ada pemain dan bukan BYE
        const adaPemain = p1 !== "" && p1 !== "..." && p2 !== "" && p2 !== "..." && !(p1 === "BYE" && p2 === "BYE");
        
        if (adaPemain) {
          // Jika skor kosong atau 0-0, pusingan belum selesai
          if ((sc1 === "" || sc2 === "" || (parseInt(sc1) === 0 && parseInt(sc2) === 0))) {
            adaMatchAktif = true;
          }
          // Jika skor ada tapi seri, masih aktif
          else if (sc1 !== "" && sc2 !== "" && sc1 === sc2) {
            adaMatchAktif = true;
          }
        }
      });

      // Jika pusingan ini ada match aktif, gunakan sebagai active round
      if (adaMatchAktif) {
        activeRoundId = roundId;
        break;
      }
    }

    // 3. Apply warna hanya pada kotak-kotak dalam Pusingan Aktif tersebut
    document.querySelectorAll(".kotak-perlawanan").forEach((box) => {
      box.classList.remove("kotak-aktif", "kotak-belum-selesai", "kotak-selesai");

      // Cek jika kotak ini milik pusingan yang aktif tadi
      if (activeRoundId && box.id.startsWith(activeRoundId + "_")) {
        const sc1 = document.getElementById(box.id + "_sc1")?.value || "";
        const sc2 = document.getElementById(box.id + "_sc2")?.value || "";
        const p1 = document.getElementById(box.id + "_p1")?.value || "";
        const p2 = document.getElementById(box.id + "_p2")?.value || "";

        const adaPemain =
          p1 !== "" && p1 !== "..." && p2 !== "" && p2 !== "...";
        const bukanBye = !(p1 === "BYE" && p2 === "BYE");

        if (adaPemain && bukanBye) {
          // JIKA SKOR 0-0 -> MERAH (Belum dimainkan)
          if (
            sc1 === "" ||
            sc2 === "" ||
            (parseInt(sc1) === 0 && parseInt(sc2) === 0)
          ) {
            box.classList.add("kotak-belum-selesai");
          }
          // JIKA DAH ADA SKOR & ADA PEMENANG -> PUTIH (Selesai)
          else if (sc1 !== "" && sc2 !== "" && sc1 !== sc2) {
            box.classList.add("kotak-selesai");
          }
          // JIKA SEDANG BERLANGSUNG (skor ada tapi belum tentu pemenang) -> BIRU
          else {
            box.classList.add("kotak-aktif");
          }
        }
      }
    });
  });
};
// --- PENJAGA STATUS ADMIN (PASTIKAN KUNCI TERBUKA SELEPAS REFRESH) ---
document.addEventListener("DOMContentLoaded", () => {
  const status = localStorage.getItem("adminStatus");
  if (status === "active") {
    window.isAdminMode = true;
    document.body.classList.add("admin-active");

    // Paparkan semula bahagian admin yang tersembunyi
    document
      .querySelectorAll(".admin-only")
      .forEach((el) => (el.style.display = "flex"));
    const authSection = document.getElementById("authSection");
    if (authSection) authSection.style.display = "none";

    // Jalankan semula fungsi input peserta
    setTimeout(() => {
      if (typeof populatePesertaInputs === "function") populatePesertaInputs();
      if (typeof updatePesertaInputDisplay === "function")
        updatePesertaInputDisplay();
    }, 100);
  }
});
