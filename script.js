import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBB6Su0uhNcKKoq9Qa_-RGb6cAZOmV2u-U",
    authDomain: "badminton2kalah.firebaseapp.com",
    databaseURL: "https://badminton2kalah-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "badminton2kalah",
    appId: "1:65294297294:web:1664f68c4ffda101cf489f"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dbRef = ref(db, 'tournament_data');

window.isAdminMode = false;
window.teamNames = {}; 

window.checkPersistentAdmin = () => {
    if(localStorage.getItem('adminStatus') === 'active') {
        window.isAdminMode = true;
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'flex');
        document.getElementById('authSection').style.display = 'none';
        setTimeout(() => { 
            populatePesertaInputs(); 
            updatePesertaInputDisplay(); 
        }, 200);
    }
};

// Modified: Admin panel sekarang menampilkan 16 pemain individually (1-16), bukan 8 matches
function populatePesertaInputs() {
    const section = document.getElementById('pesertaInputSection');
    if(!section || section.children.length > 0) return; // Jika dah ada input, jangan overwrite
    
    section.innerHTML = '';
    
    for(let i = 0; i < 16; i++) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'peserta-input-group';
        
        // Kita hanya ambil data awal dari Firebase jika ada
        let initialNama = (window.teamNames && window.teamNames[i]) ? window.teamNames[i].nama : "";
        let initialAv = (window.teamNames && window.teamNames[i]) ? window.teamNames[i].avatar : "";

        groupDiv.innerHTML = `
            <label>INPUT SLOT ${i + 1}</label>
            <input type="number" id="admin_seed${i}" value="${i+1}" min="1" max="16" placeholder="No Seed">
            <input type="text" id="admin_p${i}" value="${initialNama === 'BYE' ? '' : initialNama}" placeholder="Nama Pasukan">
            <input type="text" id="admin_av${i}" value="${initialAv}" placeholder="Link Avatar URL">
        `;
        section.appendChild(groupDiv);
    }
}

function updatePesertaInputDisplay() {
    for(let i = 0; i < 16; i++) {
        const pInput = document.getElementById(`admin_p${i}`);
        const pAvatarInput = document.getElementById(`admin_av${i}`);
        const seedInput = document.getElementById(`admin_seed${i}`);
        
        if(pInput) pInput.value = (window.teamNames && window.teamNames[i]) ? window.teamNames[i].nama : '';
        if(pAvatarInput) pAvatarInput.value = (window.teamNames && window.teamNames[i]) ? window.teamNames[i].avatar || '' : '';
        if(seedInput) seedInput.value = i + 1;
    }
}

window.syncPesertaInput = (seedIndex, value, field) => {
    if(!window.teamNames[seedIndex]) {
        window.teamNames[seedIndex] = { nama: '', avatar: '' };
    }
    window.teamNames[seedIndex][field] = value;
};

window.checkAuth = () => {
    if(document.getElementById('passInput').value === "admin123") {
        localStorage.setItem('adminStatus', 'active');
        window.isAdminMode = true;
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'flex');
        document.getElementById('authSection').style.display = 'none';
        setTimeout(() => { populatePesertaInputs(); updatePesertaInputDisplay(); }, 100);
    } else { alert("Salah!"); }
};

window.logoutAdmin = () => { localStorage.removeItem('adminStatus'); location.reload(); };
window.toggleAdmin = () => { const p = document.getElementById('panelAdmin'); p.style.display = (p.style.display === 'block') ? 'none' : 'block'; };

onValue(dbRef, (snapshot) => {
    const data = snapshot.val() || {};
    window.teamNames = data.teams || {};
    
    // Jana bracket sahaja
    jana(data.scores || {}, data.matchLabels || {});
    
    // JANGAN panggil populatePesertaInputs() di sini secara automatik 
    // supaya susunan input dalam panel admin kekal seperti yang anda tulis.
});

window.saveAll = () => {
    let teams = {};
    
    // 1. Ambil data dari 16 input secara "Direct Mapping"
    // Kita cari input mana yang ada nombor seed tertentu
    for(let seedTarget = 1; seedTarget <= 16; seedTarget++) {
        let found = false;
        
        for(let i = 0; i < 16; i++) {
            const seedInput = document.getElementById(`admin_seed${i}`);
            const pInput = document.getElementById(`admin_p${i}`);
            const pAvatarInput = document.getElementById(`admin_av${i}`);
            
            if(seedInput && parseInt(seedInput.value) === seedTarget) {
                // Simpan ke dalam index bracket (0-15) mengikut Target Seed
                teams[seedTarget - 1] = {
                    nama: pInput.value.trim() === "" ? "BYE" : pInput.value.trim(),
                    avatar: pAvatarInput.value.trim()
                };
                found = true;
                break;
            }
        }
        
        // Jika nombor seed itu tak wujud/tertinggal, letak BYE
        if(!found) {
            teams[seedTarget - 1] = { nama: "BYE", avatar: "" };
        }
    }

    let scores = {};
    document.querySelectorAll('.skor').forEach(s => { if(s.value !== "") scores[s.id] = s.value; });

    let matchLabels = {};
    document.querySelectorAll('.match-top-input').forEach(mi => { if(mi.value && mi.value.trim() !== '') matchLabels[mi.id] = mi.value.trim(); });

    // SIMPAN KE FIREBASE
    set(dbRef, { n: 16, teams, scores, matchLabels }).then(() => {
        const toast = document.getElementById('syncToast');
        toast.style.opacity = "1";
        setTimeout(() => { toast.style.opacity = "0"; }, 3000);
        // PENTING: Jangan panggil populatePesertaInputs() di sini supaya 
        // kedudukan input nama/link dalam panel admin tidak berubah (kekal statik).
    });
};

window.resetSkor = async () => {
    if(confirm("Reset semua skor sahaja? Nama & Nombor Match akan dikekalkan.")) {
        const snapshot = await get(dbRef);
        const data = snapshot.val() || {};
        set(dbRef, { 
            n: 16, 
            teams: data.teams || {}, 
            scores: {}, 
            matchNumbers: data.matchNumbers || {} 
        }).then(() => location.reload());
    }
};

window.resetTournament = () => {
    if(confirm("Reset semua data? Ini akan memadam SEMUA Nama, Skor dan Nombor Match.")) {
        set(dbRef, { n: 16, teams: {}, scores: {}, matchNumbers: {} }).then(() => location.reload());
    }
};

// Modified: Match numbers now display as P1-P8 instead of 1-8
function createBox(j, r, m, matchNum) {
    let id = `${j}_${r}_${m}`;
    const wrapper = document.createElement('div');
    wrapper.className = 'match-wrapper';

    let box = document.createElement('div');
    box.className = 'kotak-perlawanan';
    box.id = id;

    // Tentukan label secara automatik atau manual
    let matchValue = '';
    if(j === 'GF') matchValue = 'P30 GRAND FINAL';
    else if(j === 'L' && r === 5) matchValue = 'P29 FINAL LOSER';
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
            <input type="number" class="skor" id="${id}_sc1" oninput="window.kira('${id}')">
        </div>
        <div class="slot-pasukan" id="${id}_s2">
            <span class="seed-no" id="${id}_sd2" style="display:none"></span>
            <div class="avatar" id="${id}_av2"></div>
            <input type="text" class="nama-display" id="${id}_p2" placeholder="..." readonly>
            <input type="number" class="skor" id="${id}_sc2" oninput="window.kira('${id}')">
        </div>`;

    wrapper.appendChild(box);
    return wrapper;
}

function getAvatarColor(nama) {
    const colors = [
        '#667eea', '#764ba2', '#f093fb', '#4facfe',
        '#00f2fe', '#43e97b', '#fa709a', '#fee140',
        '#30cfd0', '#330867', '#eb3349', '#f45c43',
        '#fa7e1e', '#d946ef', '#0369a1', '#06b6d4'
    ];
    if(!nama || nama === "BYE" || nama === "...") return '#666';
    let hash = 0;
    for(let i = 0; i < nama.length; i++) {
        hash = ((hash << 5) - hash) + nama.charCodeAt(i);
        hash = hash & hash;
    }
    return colors[Math.abs(hash) % colors.length];
}

function getAvatarInitials(nama) {
    if(!nama || nama === "BYE" || nama === "...") return "BYE";
    const parts = nama.trim().split(/\s+/);
    if(parts.length >= 2) {
        return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
    }
    return nama.substring(0, 2).toUpperCase();
}

function updateAvatar(id, slot, nama, avatarUrl) {
    const avEl = id === 'pod' 
        ? document.getElementById(`pod_av${slot}`)
        : document.getElementById(`${id}_av${slot}`);
    if(!avEl) return;
    
    // Jika ada avatar URL, gunakan sebagai background image
    if(avatarUrl && avatarUrl.trim() !== '') {
        avEl.style.backgroundImage = `url('${avatarUrl}')`;
        avEl.style.backgroundSize = 'cover';
        avEl.style.backgroundPosition = 'center';
        avEl.innerText = '';
        avEl.style.color = 'transparent';
    } else {
        // Jika tiada avatar URL, gunakan inisial
        avEl.style.backgroundImage = 'none';
        avEl.innerText = getAvatarInitials(nama);
        avEl.style.color = '#fff';
        const color = getAvatarColor(nama);
        avEl.style.background = (nama === "BYE" || !nama || nama === "...") 
            ? '#666' 
            : `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`;
    }
    
    if(nama === "BYE" || !nama || nama === "...") {
        avEl.classList.add('bye-avatar');
    } else {
        avEl.classList.remove('bye-avatar');
    }
}

function jana(savedScores, savedMatchLabels) {
    const bw = document.getElementById('barisW'); 
    const bl = document.getElementById('barisL');
    const podiumClone = document.getElementById('podiumFinal');

    bw.innerHTML = '<div class="label-bracket">Winner Bracket (Upper)</div>'; 
    bl.innerHTML = '<div class="label-bracket">Loser Bracket (Lower)</div>';
    bw.appendChild(podiumClone);

    let winMatchOffsets = [1, 9, 13, 15]; 
    for(let r=0; r<4; r++) {
        let div = document.createElement('div'); 
        div.className = 'pusingan';
        for(let m=0; m<Math.pow(2, 3-r); m++) {
            div.appendChild(createBox('W', r, m, winMatchOffsets[r] + m));
        }
        bw.appendChild(div);
    }

   let divGF = document.createElement('div'); 
divGF.className = 'pusingan';
// Kita panggil createBox, kemudian simpan dalam variable 'gfWrapper'
let gfWrapper = createBox('GF', 0, 0, 30); 
// Kita cari kotak di dalamnya dan tambah class 'grand-final'
gfWrapper.querySelector('.kotak-perlawanan').classList.add('grand-final');
divGF.appendChild(gfWrapper); 
bw.appendChild(divGF);

    const loserMatchesCount = [4, 4, 2, 2, 1, 1];
    let losMatchOffsets = [16, 20, 24, 26, 28, 29];
    for(let r=0; r < 6; r++) {
        let div = document.createElement('div'); 
        div.className = 'pusingan';
        for(let m=0; m < loserMatchesCount[r]; m++) {
            let matchNum = losMatchOffsets[r] + m;
            let box = createBox('L', r, m, matchNum);
            if(r === 5) box.classList.add('loser-final-highlight');
            div.appendChild(box);
        }
        bl.appendChild(div);
    }

    const seeds = [0, 15, 7, 8, 3, 12, 4, 11, 1, 14, 6, 9, 2, 13, 5, 10];
    for(let m=0; m < 8; m++) {
        updateSlot(`W_0_${m}`, 1, window.teamNames[seeds[m*2]]?.nama || "", seeds[m*2]);
        updateSlot(`W_0_${m}`, 2, window.teamNames[seeds[m*2+1]]?.nama || "", seeds[m*2+1]);
    }

    for(let id in savedScores) {
        const input = document.getElementById(id);
        if(input) input.value = savedScores[id];
    }

    // restore match-top labels if any
    for(let id in (savedMatchLabels || {})) {
        const el = document.getElementById(id);
        if(el) el.value = savedMatchLabels[id];
    }

    const flow = ['W_0','W_1','W_2','W_3','L_0','L_1','L_2','L_3','L_4','L_5','GF_0'];
    flow.forEach(f => {
        document.querySelectorAll(`[id^="${f}_"]`).forEach(box => {
            if(box.classList.contains('kotak-perlawanan')) window.kira(box.id);
        });
    });
    autoBye();
    penyelarasanLebar();

  // --- Letakkan ini di bahagian paling bawah dalam fungsi jana() ---

// 1. Kunci SEMUA nama dalam bracket (Winner/Loser/GF)
document.querySelectorAll('.nama-display').forEach(el => {
    el.readOnly = true; 
    el.style.pointerEvents = "none"; // Halang klik terus
    el.style.background = "transparent"; 
});

// 2. Kunci label Match (P1, P2, dll)
document.querySelectorAll('.match-top-input').forEach(el => {
    el.readOnly = true;
    el.style.pointerEvents = "none";
});

// 3. Kawalan Input Skor
document.querySelectorAll('.skor').forEach(el => {
    if (window.isAdminMode) {
        el.readOnly = false;
        el.style.pointerEvents = "auto";
        el.style.border = "1px solid #444"; // Nampak boleh edit
    } else {
        el.readOnly = true;
        el.style.pointerEvents = "none";
        el.style.border = "none"; // Nampak bersih
    }
});

// 4. Input Nama di Panel Admin (Hanya ini yang boleh diedit oleh Admin)
if(window.isAdminMode) {
    document.querySelectorAll('#pesertaInputSection input').forEach(el => {
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
    if(pEl) pEl.value = nama;
    if(sEl) sEl.setAttribute('data-pid', pid);
    
    const avatarUrl = (window.teamNames && window.teamNames[pid]) ? window.teamNames[pid].avatar || '' : '';
    updateAvatar(mid, slot, nama, avatarUrl);

    // Seed-no display logic - hanya untuk round pertama winner bracket
    if(sdEl && mid.startsWith('W_0_')) {
        sdEl.innerText = (parseInt(pid) + 1).toString().padStart(2, '0');
        sdEl.style.display = "flex";
    } else if(sdEl) {
        sdEl.style.display = "none";
    }
}

function updatePathSoftColors(nama, cssClass) {
    if(!nama || nama === "BYE" || nama === "...") return;
    document.querySelectorAll('.slot-pasukan').forEach(slot => {
        if(slot.querySelector('.nama-display').value === nama) {
            slot.classList.remove('path-emas', 'path-perak', 'path-gangsa');
            slot.classList.add(cssClass);
        }
    });
}

window.kira = (id) => {
    let sc1 = document.getElementById(id+'_sc1').value, sc2 = document.getElementById(id+'_sc2').value;
    const sl1 = document.getElementById(id+'_s1'), sl2 = document.getElementById(id+'_s2');
    if(sc1 === "" || sc2 === "" || sc1 === sc2) return;

    let win = parseInt(sc1) > parseInt(sc2) ? 1 : 2;
    sl1.classList.toggle('pemenang', win === 1); 
    sl2.classList.toggle('pemenang', win === 2);

    let winN = document.getElementById(`${id}_p${win}`).value, 
        winP = document.getElementById(`${id}_s${win}`).getAttribute('data-pid');
    let losN = document.getElementById(`${id}_p${win===1?2:1}`).value, 
        losP = document.getElementById(`${id}_s${win===1?2:1}`).getAttribute('data-pid');

    let p = id.split('_'), r = parseInt(p[1]), m = parseInt(p[2]);

    if(p[0] === 'W') {
        let nextR = r + 1, nextM = Math.floor(m/2), nextS = (m % 2) + 1;
        if(r < 3) updateSlot(`W_${nextR}_${nextM}`, nextS, winN, winP);
        else if(r === 3) updateSlot('GF_0_0', 1, winN, winP);

        if(r === 0) updateSlot(`L_0_${Math.floor(m/2)}`, (m % 2) + 1, losN, losP);
        else if(r === 1) updateSlot(`L_1_${3-m}`, 2, losN, losP);
        else if(r === 2) updateSlot(`L_3_${1-m}`, 2, losN, losP);
        else if(r === 3) updateSlot(`L_5_0`, 2, losN, losP);
    } else if(p[0] === 'L') {
        if(r < 5) {
            if(r % 2 === 0) updateSlot(`L_${r+1}_${m}`, 1, winN, winP);
            else updateSlot(`L_${r+1}_${Math.floor(m/2)}`, (m % 2) + 1, winN, winP);
        } else {
            updateSlot('GF_0_0', 2, winN, winP);
            document.getElementById('res_3').innerText = losN;
            const losAvatar = (window.teamNames && window.teamNames[losP]) ? window.teamNames[losP].avatar || '' : '';
            updateAvatar('pod', 3, losN, losAvatar);
            updatePathSoftColors(losN, 'path-gangsa');
        }
    } else if(p[0] === 'GF') {
        document.getElementById('res_1').innerText = winN;
        document.getElementById('res_2').innerText = losN;
        const winAvatar = (window.teamNames && window.teamNames[winP]) ? window.teamNames[winP].avatar || '' : '';
        const losAvatar = (window.teamNames && window.teamNames[losP]) ? window.teamNames[losP].avatar || '' : '';
        updateAvatar('pod', 1, winN, winAvatar);
        updateAvatar('pod', 2, losN, losAvatar);
        document.getElementById('podiumFinal').style.display = 'block';
        updatePathSoftColors(winN, 'path-emas');
        updatePathSoftColors(losN, 'path-perak');
    }
};

function autoBye() {
    document.querySelectorAll('.kotak-perlawanan').forEach(box => {
        let p1 = document.getElementById(box.id+'_p1').value, 
            p2 = document.getElementById(box.id+'_p2').value;
        let sc1 = document.getElementById(box.id+'_sc1'), 
            sc2 = document.getElementById(box.id+'_sc2');
        if(p1 === "BYE" && p2 !== "" && p2 !== "BYE" && sc1.value === "") { 
            sc1.value=0; sc2.value=21; window.kira(box.id); 
        }
        else if(p2 === "BYE" && p1 !== "" && p1 !== "BYE" && sc2.value === "") { 
            sc1.value=21; sc2.value=0; window.kira(box.id); 
        }
    });
}

function penyelarasanLebar() {
    setTimeout(() => {
        const bw = document.getElementById('barisW');
        const bl = document.getElementById('barisL');
        if(!bw || !bl) return;
        bw.style.minWidth = "0"; 
        bl.style.minWidth = "0";
        const max = Math.max(bw.scrollWidth, bl.scrollWidth);            
        bw.style.minWidth = max + "px";
        bl.style.minWidth = max + "px";
    }, 100);
}
// Fungsi untuk swap nombor secara automatik jika ada yang sama
document.addEventListener('change', function(e) {
    if (e.target && e.target.id.startsWith('admin_seed')) {
        let currentInput = e.target;
        let newValue = parseInt(currentInput.value);
        let oldValue = parseInt(currentInput.defaultValue) || (parseInt(currentInput.id.replace('admin_seed', '')) + 1);

        document.querySelectorAll('input[id^="admin_seed"]').forEach(input => {
            if (input !== currentInput && parseInt(input.value) === newValue) {
                input.value = oldValue; // Tukar nombor yang bertindih tadi ke nombor asal input ini
                input.defaultValue = oldValue;
            }
        });
        currentInput.defaultValue = newValue;
    }
});
