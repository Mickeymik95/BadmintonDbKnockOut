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
    if(!section) return;
    
    section.innerHTML = '';
    
    // Create grid layout untuk 16 pemain (2 kolom)
    for(let i = 0; i < 16; i++) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'peserta-input-group';
        groupDiv.setAttribute('data-seed', i);
        
        const playerLabel = document.createElement('label');
        playerLabel.innerText = `PEMAIN ${i + 1}`;  // Player 1 - Player 16
        groupDiv.appendChild(playerLabel);

        // Seed number input (1-16)
        const seedInput = document.createElement('input');
        seedInput.type = 'number';
        seedInput.min = 1;
        seedInput.max = 16;
        seedInput.id = `admin_seed${i}`;
        seedInput.style.width = '100%';
        seedInput.placeholder = 'Seed (1-16)';
        seedInput.value = (window.teamNames && window.teamNames[i]) ? (parseInt(i)+1) : (i+1);
        seedInput.oninput = function() { /* no-op: value read on save */ };
        groupDiv.appendChild(seedInput);

        // Player Name Input
        const pInput = document.createElement('input');
        pInput.type = 'text';
        pInput.id = `admin_p${i}`;
        pInput.placeholder = `Nama Pemain`;
        pInput.value = (window.teamNames && window.teamNames[i]) ? window.teamNames[i].nama : '';
        pInput.oninput = function() { syncPesertaInput(i, this.value, 'nama'); };
        groupDiv.appendChild(pInput);

        // Player Avatar Link
        const pAvatarInput = document.createElement('input');
        pAvatarInput.type = 'text';
        pAvatarInput.id = `admin_av${i}`;
        pAvatarInput.placeholder = `Avatar URL`;
        pAvatarInput.value = (window.teamNames && window.teamNames[i]) ? window.teamNames[i].avatar || '' : '';
        pAvatarInput.oninput = function() { syncPesertaInput(i, this.value, 'avatar'); };
        groupDiv.appendChild(pAvatarInput);
        
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
    jana(data.scores || {}, data.matchLabels || {});
    
    // Update peserta inputs jika admin mode aktif
    if(window.isAdminMode) {
        populatePesertaInputs();
        updatePesertaInputDisplay();
    }
});

window.saveAll = () => {
    let teams = {};
    
    // Ambil data dari 16 pemain inputs (tidak lagi dari 8 matches)
    for(let i = 0; i < 16; i++) {
        const pInput = document.getElementById(`admin_p${i}`);
        const pAvatarInput = document.getElementById(`admin_av${i}`);
        const seedInput = document.getElementById(`admin_seed${i}`);

        const p = pInput ? pInput.value.trim() : '';
        const pAvatar = pAvatarInput ? pAvatarInput.value.trim() : '';
        let seedIndex = i;
        if(seedInput) {
            const val = parseInt(seedInput.value);
            if(!isNaN(val) && val >= 1 && val <= 16) seedIndex = val - 1;
        }

        teams[seedIndex] = { 
            nama: p !== "" ? p : "BYE",
            avatar: pAvatar
        };
    }
    
    let scores = {};
    document.querySelectorAll('.skor').forEach(s => { if(s.value !== "") scores[s.id] = s.value; });

    // collect match-top labels
    let matchLabels = {};
    document.querySelectorAll('.match-top-input').forEach(mi => { if(mi.value && mi.value.trim() !== '') matchLabels[mi.id] = mi.value.trim(); });

    set(dbRef, { n: 16, teams, scores, matchLabels }).then(() => {
        const toast = document.getElementById('syncToast');
        toast.style.opacity = "1";
        setTimeout(() => { toast.style.opacity = "0"; }, 3000);
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

    // Create wrapper that holds the kotak-perlawanan
    const wrapper = document.createElement('div');
    wrapper.className = 'match-wrapper';

    // kotak-perlawanan element
    let box = document.createElement('div');
    box.className = 'kotak-perlawanan';
    box.id = id;
    if(j === 'GF') box.classList.add('grand-final');

    // Match label input area: leave blank by default for all matches
    // Keep defaults only for special finals:
    // - Lower bracket final (L r=5): P29 final loser bracket
    // - Grand final (GF): P30 Grand final
    let matchValue = '';
    if(j === 'GF') { matchValue = 'P30 Grand final'; box.classList.add('grand-final'); }
    else if(j === 'L' && r === 5) { matchValue = 'P29 final loser bracket'; }

    // Insert top input and seed-no inside each slot, to the left of avatar
    box.innerHTML = `
        <input type="text" class="match-top-input" id="${id}_label" placeholder="" />
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
    divGF.appendChild(createBox('GF', 0, 0, 30)); 
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

    document.querySelectorAll('.skor, .nama-display, .match-top-input').forEach(el => {
        if(el.classList.contains('nama-display')) {
            const isRound1 = el.id.startsWith('W_0_');
            el.readOnly = !(window.isAdminMode && isRound1);
        } else {
            el.readOnly = !window.isAdminMode;
        }
    });
    
    if(window.isAdminMode) {
        populatePesertaInputs();
        updatePesertaInputDisplay();
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
