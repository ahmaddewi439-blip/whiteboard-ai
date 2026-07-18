const KOBOI_API_KEY = 'sk-yYZlMG4TnNb2curlh9fwfg'; 

let arrayGambarTerpilih = []; 

// --- FITUR AI (KOBOI) & PENCARIAN SVG (ICONIFY) ---
document.getElementById('searchBtn').addEventListener('click', async () => {
    const scriptText = document.getElementById('scriptInput').value;
    const gallery = document.getElementById('imageGallery');
    
    if (!scriptText) return alert("Isi skripnya dulu ya!");

    document.getElementById('searchBtn').innerText = "AI sedang menganalisis...";
    gallery.innerHTML = "<p style='color: #007bff;'>🤖 AI Koboi sedang membaca skripmu...</p>";

    const url = "https://lite.koboillm.com/v1/chat/completions";
    const prompt = `Skrip: "${scriptText}". Ekstrak maksimal 3 KATA BENDA visual utama. Output HARUS murni array JSON teks dalam bahasa Inggris tanpa embel-embel. Contoh: ["desk", "lamp", "laptop"]`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${KOBOI_API_KEY}` 
            },
            body: JSON.stringify({
                model: "openai/gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.1
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`AI Gagal: ${data.error?.message || 'Koneksi Ditolak'}`);
        }

        const responTeks = data.choices[0].message.content.trim(); 
        const jsonMatch = responTeks.match(/\[(.*?)\]/);
        if (!jsonMatch) throw new Error("AI tidak memberikan format JSON yang benar.");

        const keywords = JSON.parse(jsonMatch[0]);
        gallery.innerHTML = ""; 

        for (let keyword of keywords) {
            const barisObjek = document.createElement('div');
            barisObjek.style.marginBottom = "15px";
            barisObjek.style.paddingBottom = "10px";
            barisObjek.style.borderBottom = "1px solid #ddd";
            barisObjek.innerHTML = `<p style="margin: 5px 0; font-weight: bold; color: #333;">Pilih Sketsa untuk: "${keyword}"</p>`;
            
            const iconifyUrl = `https://api.iconify.design/search?query=${keyword}+line&limit=5`;
            const res = await fetch(iconifyUrl);
            const iconData = await res.json();
            
            if (iconData.icons && iconData.icons.length > 0) {
                iconData.icons.forEach(async (iconName) => {
                    const [prefix, name] = iconName.split(':');
                    const svgUrl = `https://api.iconify.design/${prefix}/${name}.svg`;
                    
                    const svgResponse = await fetch(svgUrl);
                    const svgCode = await svgResponse.text();

                    const imgWrapper = document.createElement('div');
                    imgWrapper.style.display = "inline-block";
                    imgWrapper.style.margin = "5px";
                    imgWrapper.style.padding = "5px";
                    imgWrapper.style.cursor = "pointer";
                    imgWrapper.style.border = "2px solid #ccc";
                    imgWrapper.style.borderRadius = "8px";
                    imgWrapper.style.backgroundColor = "#fff";

                    imgWrapper.innerHTML = svgCode;
                    const svgTag = imgWrapper.querySelector('svg');
                    
                    if(svgTag) {
                        svgTag.style.width = "60px";
                        svgTag.style.height = "60px";
                        svgTag.style.color = "#000";
                    }

                    imgWrapper.addEventListener('click', () => {
                        pilihGambar(svgCode);
                        imgWrapper.style.border = "2px solid #28a745"; 
                        imgWrapper.style.backgroundColor = "#e9f7ef";
                    });

                    barisObjek.appendChild(imgWrapper);
                });
                
                gallery.appendChild(barisObjek);
            } else {
                gallery.innerHTML += `<div style="margin-bottom:15px; color:red;">Sketsa untuk "${keyword}" tidak ditemukan. Silakan unggah manual.</div>`;
            }
        }
        document.getElementById('searchBtn').innerText = "Selesai! Silakan pilih gambarnya";
    } catch (error) {
        gallery.innerHTML = `<p style="color:red; font-weight:bold;">Terdapat Kesalahan: ${error.message}</p>`;
        document.getElementById('searchBtn').innerText = "Menganalisis Skrip & Cari Gambar";
        console.error(error);
    }
});

function ekstrakKataKunci(teks) {
    const t = teks.toLowerCase();
    if (t.includes("meja") || t.includes("kantor") || t.includes("kerja")) return "desk";
    if (t.includes("lampu") || t.includes("terang") || t.includes("ide")) return "lamp";
    if (t.includes("kucing") || t.includes("hewan") || t.includes("peliharaan")) return "cat";
    if (t.includes("laptop") || t.includes("komputer")) return "laptop";
    if (t.includes("buku") || t.includes("belajar") || t.includes("sekolah")) return "book";
    if (t.includes("mobil") || t.includes("jalan") || t.includes("kendaraan")) return "car";
    if (t.includes("rumah") || t.includes("keluarga")) return "house";
    if (t.includes("pohon") || t.includes("hutan") || t.includes("alam")) return "tree";
    if (t.includes("uang") || t.includes("gaji") || t.includes("kaya")) return "money";
    return "doodle"; 
}

// --- FITUR UPLOAD GAMBAR MANUAL (SEMUA FORMAT BISA MASUK) ---
document.getElementById('uploadManualBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ekstensiGambar = /\.(svg|png|jpe?g|gif|webp|bmp|ico|avif)$/i;
    const isGambar = file.type.startsWith('image/') || ekstensiGambar.test(file.name);

    if (!isGambar) {
        alert("Pilih file gambar yang valid!");
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => { pilihGambar(event.target.result); };
    reader.onerror = () => { alert("Gagal membaca file."); e.target.value = ''; };
    
    const isSVG = file.type.includes("svg") || file.name.toLowerCase().endsWith('.svg');
    if (isSVG) { reader.readAsText(file); } else { reader.readAsDataURL(file); }
    e.target.value = ''; 
});

function pilihGambar(imgSrc) {
    if (arrayGambarTerpilih.length >= 3) {
        return alert("Maksimal 3 gambar untuk adegan 10 detik!");
    }
    arrayGambarTerpilih.push(imgSrc);
    document.getElementById('gambarTerpilihInfo').innerText = `Gambar Terpilih: ${arrayGambarTerpilih.length} / 3`;
    document.getElementById('gambarTerpilihInfo').style.color = "green";
    
    if (arrayGambarTerpilih.length > 0) {
        document.getElementById('recordBtn').style.display = "inline-block";
    }
}

// --- MESIN RENDER DAN REKAM VIDEO ---
document.getElementById('recordBtn').addEventListener('click', async () => {
    const btn = document.getElementById('recordBtn');
    btn.disabled = true;
    btn.innerText = "Merekam ke Canvas... Harap Tunggu 10 Detik";
    
    await mulaiAnimasiDanRekam(arrayGambarTerpilih);
    
    btn.innerText = "Video Selesai Direkam!";
    document.getElementById('downloadBtn').style.display = "inline-block";
});

async function mulaiAnimasiDanRekam(daftarGambar) {
    if (typeof Vivus === 'undefined') return alert("Library Vivus hilang!");

    const canvas = document.getElementById('whiteboardCanvas');
    const ctx = canvas.getContext('2d');
    const svgLayer = document.getElementById('svgLayer');

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    svgLayer.innerHTML = "";

    const layout = [
        { left: "50px", top: "80px", size: "220px" },  
        { left: "350px", top: "80px", size: "220px" }, 
        { left: "200px", top: "180px", size: "180px" }  
    ];

    const totalFrame = 600; 
    const framePerGambar = Math.floor(totalFrame / daftarGambar.length);

    const stream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    let chunks = [];
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    
    const janjiRekaman = new Promise((resolve) => {
        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            document.getElementById('downloadBtn').href = URL.createObjectURL(blob);
            resolve();
        };
    });

    mediaRecorder.start();

    for (let i = 0; i < daftarGambar.length; i++) {
        const posisi = layout[i % layout.length];
        await prosesSatuGambarSVG(daftarGambar[i], canvas, ctx, svgLayer, posisi, framePerGambar);
    }

    setTimeout(() => { mediaRecorder.stop(); }, 1000);
    return janjiRekaman;
}

// --- FUNGSI PROSES GAMBAR DENGAN TANGAN PENSIL ---
function prosesSatuGambarSVG(svgData, canvas, ctx, svgLayer, posisi, durasiFrame) {
    return new Promise((resolve) => {
        
        // 1. JIKA GAMBAR BUKAN VEKTOR (PNG/JPG) - EFEK ARSIR TANGAN
        if (svgData.startsWith('data:')) {
            const img = new Image();
            img.onload = function () {
                const x = parseInt(posisi.left);
                const y = parseInt(posisi.top);
                const s = parseInt(posisi.size);
                
                let frameAktif = 0;
                function arsiranTangan() {
                    if (frameAktif > durasiFrame) {
                        setTimeout(() => { resolve(); }, 500);
                        return;
                    }
                    // Cetak gambar ke layar
                    ctx.drawImage(img, x, y, s, s);
                    
                    // Hitung pola gerak tangan zig-zag seperti mewarnai
                    let progress = frameAktif / durasiFrame;
                    let penX = x + (progress * s);
                    let penY = y + (Math.abs(Math.sin(progress * Math.PI * 5)) * s);

                    // Tambahkan stiker tangan pensil
                    ctx.font = "40px Arial";
                    ctx.fillText("✍🏽", penX - 25, penY + 15);
                    
                    frameAktif++;
                    requestAnimationFrame(arsiranTangan);
                }
                arsiranTangan();
            };
            img.onerror = () => resolve();
            img.src = svgData;
            return; 
        }

        // 2. JIKA GAMBAR VEKTOR SVG - EFEK TANGAN MENGIKUTI JALUR PRESISI
        const wrapper = document.createElement('div');
        wrapper.innerHTML = svgData;
        const svgElement = wrapper.querySelector('svg');
        if (!svgElement) return resolve();

        if (!svgElement.getAttribute('xmlns')) svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

        svgElement.style.width = posisi.size;
        svgElement.style.height = posisi.size;
        svgElement.style.position = "absolute";
        svgElement.style.left = posisi.left; 
        svgElement.style.top = posisi.top;

        const paths = svgElement.querySelectorAll('path, line, polyline, polygon, rect, circle, ellipse');
        paths.forEach(p => {
            p.setAttribute('stroke', '#000');
            p.setAttribute('fill', 'none');
            p.style.strokeWidth = "3px";
            p.style.vectorEffect = "non-scaling-stroke";
        });

        svgLayer.appendChild(svgElement);

        // Rumus matematika menghitung skala koordinat SVG ke Kanvas
        let viewBox = svgElement.viewBox.baseVal;
        let svgW = viewBox ? viewBox.width : (parseFloat(svgElement.getAttribute('width')) || 24);
        let svgH = viewBox ? viewBox.height : (parseFloat(svgElement.getAttribute('height')) || 24);
        let scaleX = parseInt(posisi.size) / svgW;
        let scaleY = parseInt(posisi.size) / svgH;

        let isSyncing = true;
        let mesinVivus = null;

        mesinVivus = new Vivus(svgElement, {
            type: 'oneByOne', 
            duration: durasiFrame,    
            animTimingFunction: Vivus.EASE
        }, function () {
            setTimeout(() => { isSyncing = false; resolve(); }, 500); 
        });

        function syncToCanvas() {
            if (!isSyncing) return; 
            
            const svgString = new XMLSerializer().serializeToString(svgElement);
            const DOMURL = self.URL || self.webkitURL || self;
            const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
            const url = DOMURL.createObjectURL(svgBlob);

            const img = new Image();
            img.onload = function () {
                const x = parseInt(posisi.left);
                const y = parseInt(posisi.top);
                const s = parseInt(posisi.size);
                
                ctx.drawImage(img, x, y, s, s);

                // --- ALGORITMA PELACAK KOORDINAT TANGAN (ZERO BUG) ---
                if (mesinVivus && mesinVivus.currentFrame < mesinVivus.frameCount) {
                    let penX = 0; let penY = 0;
                    let garisAktifDitemukan = false;
                    const frame = mesinVivus.currentFrame;

                    for (let i = 0; i < mesinVivus.map.length; i++) {
                        const item = mesinVivus.map[i];
                        if (frame >= item.startAt && frame <= (item.startAt + item.duration)) {
                            let kemajuanGaris = (frame - item.startAt) / item.duration;
                            try {
                                if (item.el.tagName.toLowerCase() === 'path') {
                                    const titik = item.el.getPointAtLength(kemajuanGaris * item.el.getTotalLength());
                                    penX = titik.x; penY = titik.y;
                                } else {
                                    const kotak = item.el.getBBox();
                                    penX = kotak.x + (kotak.width * kemajuanGaris);
                                    penY = kotak.y + (kotak.height * kemajuanGaris);
                                }
                                garisAktifDitemukan = true;
                            } catch(e) {}
                            break; // Berhenti mencari jika sudah menemukan garis yang aktif
                        }
                    }

                    if (garisAktifDitemukan) {
                        const koordinatAkhirX = x + (penX * scaleX);
                        const koordinatAkhirY = y + (penY * scaleY);
                        
                        // Menampilkan tangan sedang menggambar
                        ctx.font = "45px Arial";
                        ctx.fillText("✍🏽", koordinatAkhirX - 25, koordinatAkhirY + 15);
                    }
                }

                DOMURL.revokeObjectURL(url); 
            };
            img.src = url;

            requestAnimationFrame(syncToCanvas);
        }
        syncToCanvas();
    });
}
