const KOBOI_API_KEY = 'sk-yYZlMG4TnNb2curlh9fwfg'; // berawalan sk-...
const PIXABAY_API_KEY = '56717181-1bdaa7d9b5cb3aeec019a0d00';

let arrayGambarTerpilih = []; 

// --- TOMBOL 1: MENCARI GAMBAR SKETSA (VERSI ANTI-NGAWUR) ---
document.getElementById('searchBtn').addEventListener('click', async () => {
    const scriptText = document.getElementById('scriptInput').value;
    const gallery = document.getElementById('imageGallery');
    
    if (!scriptText) return alert("Isi skripnya dulu ya!");

    document.getElementById('searchBtn').innerText = "AI sedang menganalisis...";
    gallery.innerHTML = "<p>Meminta petunjuk dari AI Google...</p>";

const url = "https://lite.koboillm.com/v1/chat/completions";

    const prompt = `Skrip: "${scriptText}". Ekstrak maksimal 3 KATA BENDA visual utama. Output HARUS murni array JSON teks dalam bahasa Inggris tanpa embel-embel. Contoh: ["cat", "mouse", "cheese"]`;

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
            console.error("Error API Koboi:", data);
            throw new Error(`AI Gagal: ${data.error?.message || 'Koneksi Ditolak'}`);
        }

        const responTeks = data.choices[0].message.content.trim(); 
        const jsonMatch = responTeks.match(/\[(.*?)\]/);
        if (!jsonMatch) throw new Error("AI tidak memberikan format JSON yang benar.");

        const keywords = JSON.parse(jsonMatch[0]);
        gallery.innerHTML = ""; 

        // PERBAIKAN 3: Strategi Pencarian Pixabay yang Baru
        for (let keyword of keywords) {
     
// 1. Kita paksa Pixabay mencari "outline" (garis luar) atau "doodle" (coretan)
const searchQuery = encodeURIComponent(keyword + " outline doodle");

// 2. Kita tambahkan filter colors=grayscale agar gambarnya tidak warna-warni
const pixabayUrl = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${searchQuery}&image_type=vector&colors=grayscale&per_page=5`;
            
            const res = await fetch(pixabayUrl);
            const pixabayData = await res.json();
            
            if (pixabayData.hits && pixabayData.hits.length > 0) {
                const barisObjek = document.createElement('div');
                barisObjek.style.marginBottom = "15px";
                barisObjek.style.paddingBottom = "10px";
                barisObjek.style.borderBottom = "1px solid #ddd";
                barisObjek.innerHTML = `<p style="margin: 5px 0; font-weight: bold; color: #333;">Pilih Sketsa untuk: "${keyword}"</p>`;
                
                pixabayData.hits.forEach(hit => {
                    const imgEl = document.createElement('img');
                    imgEl.src = hit.webformatURL; 
                    imgEl.className = 'ikon-hasil';
                    imgEl.title = `Klik untuk memilih ${keyword}`;
                    imgEl.style.width = "80px";
                    imgEl.style.height = "80px";
                    imgEl.style.objectFit = "contain";
                    imgEl.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
                    
                    imgEl.onclick = () => pilihGambar(hit.webformatURL);
                    barisObjek.appendChild(imgEl);
                });
                
                gallery.appendChild(barisObjek);
            } else {
                // Jika masih tidak ketemu (misal kata yang aneh), minta user unggah sendiri
                gallery.innerHTML += `<div style="margin-bottom:15px; color:red;">Sketsa untuk "${keyword}" tidak ditemukan di Pixabay. Silakan unggah manual.</div>`;
            }
        }
        document.getElementById('searchBtn').innerText = "Selesai! Silakan pilih gambarnya";
    } catch (error) {
        gallery.innerHTML = `<p style="color:red; font-weight:bold;">Terdapat Kesalahan: ${error.message}</p>`;
        document.getElementById('searchBtn').innerText = "Menganalisis Skrip & Cari Gambar";
        console.error(error);
    }
});
// --- FITUR UPLOAD GAMBAR MANUAL ---
document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        pilihGambar(event.target.result); 
    };
    
    // Jika file berupa SVG, kita baca sebagai "Teks/Kode Vektor"
    if (file.type === "image/svg+xml" || file.name.endsWith('.svg')) {
        reader.readAsText(file);
    } else {
        reader.readAsDataURL(file); // Jika foto biasa (PNG/JPG)
    }
});

// --- LOGIKA PEMILIHAN GAMBAR ---
function pilihGambar(imgSrc) {
    if (arrayGambarTerpilih.length >= 3) {
        return alert("Kamu sudah memilih 3 gambar! Klik tombol Rekam Video di bawah.");
    }
    
    arrayGambarTerpilih.push(imgSrc);
    document.getElementById('gambarTerpilihInfo').innerText = `Gambar Terpilih: ${arrayGambarTerpilih.length} / 3`;
    document.getElementById('gambarTerpilihInfo').style.color = "green";
    
    if (arrayGambarTerpilih.length > 0) {
        document.getElementById('recordBtn').style.display = "inline-block";
    }
}

// --- TOMBOL 2: RENDER & REKAM VIDEO (Menggunakan gambar yang dipilih) ---
document.getElementById('recordBtn').addEventListener('click', async () => {
    const btn = document.getElementById('recordBtn');
    btn.disabled = true;
    btn.innerText = "Merekam ke Canvas... Harap Tunggu 8 Detik";
    
    await mulaiAnimasiDanRekam(arrayGambarTerpilih);
    
    btn.innerText = "Video Selesai Direkam!";
    document.getElementById('downloadBtn').style.display = "inline-block";
});

// Fungsi pintar untuk mengatur ukuran & posisi gambar secara otomatis
function getLayout(index, totalImages) {
    const canvasW = 640;
    const canvasH = 360;
    let w, h, x, y;

    if (totalImages === 1) {
        w = 280; h = 280;
        x = (canvasW - w) / 2;
    } else if (totalImages === 2) {
        w = 200; h = 200;
        let gap = 50; 
        let totalArea = (w * 2) + gap;
        let startX = (canvasW - totalArea) / 2;
        x = startX + (index * (w + gap));
    } else { 
        w = 150; h = 150;
        let gap = 30;
        let totalArea = (w * 3) + (gap * 2);
        let startX = (canvasW - totalArea) / 2;
        x = startX + (index * (w + gap));
    }
    y = (canvasH - h) / 2;
    return { x, y, width: w, height: h };
}

// --- FUNGSI REKAMAN V3 (DENGAN ANIMASI TANGAN & MASKING) ---
// --- FUNGSI REKAMAN V4 (MESIN VEKTOR VIVUS) ---
function mulaiAnimasiDanRekam(daftarGambar) {
    return new Promise((resolve) => {
        const canvas = document.getElementById('whiteboardCanvas');
        const ctx = canvas.getContext('2d');
        const svgLayer = document.getElementById('svgLayer');

        // Bersihkan kanvas & layer
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        svgLayer.innerHTML = "";

        // Untuk uji coba tahap awal, kita fokus pada 1 gambar SVG pertama
        const svgData = daftarGambar[0];

        // Masukkan kode SVG ke dalam lapisan kaca transparan
        svgLayer.innerHTML = svgData;

        // Cari elemen SVG-nya dan atur ukurannya agar pas di tengah kanvas
        const svgElement = svgLayer.querySelector('svg');
        if (svgElement) {
            svgElement.style.width = "280px";
            svgElement.style.height = "280px";
            svgElement.style.position = "absolute";
            svgElement.style.left = "180px"; // Posisi sumbu X tengah
            svgElement.style.top = "40px";   // Posisi sumbu Y tengah

            // Hapus warna bawaan file agar murni menjadi garis hitam (Outline)
            const paths = svgElement.querySelectorAll('path, line, polyline, polygon, rect, circle, ellipse');
            paths.forEach(p => {
                p.setAttribute('stroke', '#000');
                p.setAttribute('stroke-width', '2');
                p.setAttribute('fill', 'none');
            });
        }

        // Siapkan Perekam Video Kanvas
        const stream = canvas.captureStream(30);
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        let chunks = [];
        mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            document.getElementById('downloadBtn').href = URL.createObjectURL(blob);
            resolve();
        };

        mediaRecorder.start();

        // 1. JALANKAN ANIMASI GARIS (VIVUS)
        new Vivus(svgElement, {
            type: 'oneByOne', // Menggambar garis per garis secara berurutan
            duration: 200,    // Durasi total animasi
            animTimingFunction: Vivus.EASE
        }, function () {
            // Saat animasi vektor selesai, hentikan rekaman
            setTimeout(() => {
                mediaRecorder.stop();
            }, 1000); 
        });

        // 2. SINKRONISASI LAYER KE KANVAS (Agar bisa terekam di video)
        function syncToCanvas() {
            if (mediaRecorder.state === "recording") {
                ctx.fillStyle = "#fff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Ubah wujud pergerakan SVG menjadi gambar yang ditangkap frame Kanvas
                const svgString = new XMLSerializer().serializeToString(svgElement);
                const DOMURL = self.URL || self.webkitURL || self;
                const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
                const url = DOMURL.createObjectURL(svgBlob);

                const img = new Image();
                img.onload = function () {
                    ctx.drawImage(img, 180, 40, 280, 280);
                    DOMURL.revokeObjectURL(url);
                };
                img.src = url;

                requestAnimationFrame(syncToCanvas);
            }
        }
        syncToCanvas();
    });
}
