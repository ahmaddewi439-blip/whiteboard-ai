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

const url = "https://lite.koboiilm.com/v1/chat/completions";
    const prompt = `Skrip: "${scriptText}". Ekstrak maksimal 3 KATA BENDA visual utama. Output HARUS murni array JSON teks dalam bahasa Inggris tanpa embel-embel. Contoh: ["cat", "mouse", "cheese"]`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${KOBOI_API_KEY}` 
            },
            body: JSON.stringify({
                model: "gpt-4o-mini", 
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
            // Cukup tambahkan kata "sketch" atau "drawing" agar Pixabay tidak bingung
            const searchQuery = encodeURIComponent(keyword + " sketch");
            
            // Hapus filter warna yang bikin error, cukup filter tipe gambar ke vector
            const pixabayUrl = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${searchQuery}&image_type=vector&per_page=5`;
            
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
document.getElementById('uploadManualBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        pilihGambar(event.target.result); // Masukkan hasil upload ke daftar pilihan
    };
    reader.readAsDataURL(file);
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

// --- FUNGSI REKAMAN V3 (DENGAN ANIMASI TANGAN & MASKING) ---
function mulaiAnimasiDanRekam(daftarGambar) {
    return new Promise((resolve) => {
        const canvas = document.getElementById('whiteboardCanvas');
        const ctx = canvas.getContext('2d');
        
        // 1. Pre-load Gambar Tangan Pensil
        const handImg = new Image();
        handImg.src = 'tangan-pensil.png'; // Pastikan file ini ada di foldermu!
        
        // 2. Pre-load Gambar Hasil Pencarian
        const loadedImages = [];
        let imagesToLoad = daftarGambar.length;

        daftarGambar.forEach((src, index) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = src;
            img.onload = () => {
                loadedImages[index] = img;
                imagesToLoad--;
                if (imagesToLoad === 0) jalankanRekaman();
            };
        });

        function jalankanRekaman() {
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
            let frame = 0;

            function drawLoop() {
                ctx.fillStyle = "#fff";
                ctx.fillRect(0, 0, canvas.width, canvas.height); 

                // Logika Waktu: Tiap gambar diberi durasi 90 frame (3 detik)
                let currentImageIndex = Math.floor(frame / 90);
                let currentFrame = frame % 90; 

                // A. Tampilkan penuh gambar yang SUDAH selesai digambar
                for (let i = 0; i < currentImageIndex; i++) {
                    if (loadedImages[i]) {
                        ctx.drawImage(loadedImages[i], 50 + (i * 180), 100, 150, 150);
                    }
                }

                // B. Animasikan gambar yang SEDANG digambar saat ini
                if (currentImageIndex < loadedImages.length && loadedImages[currentImageIndex]) {
                    // Beri waktu 60 frame untuk menggambar, 30 frame untuk jeda antar gambar
                    let progress = currentFrame / 60; 
                    if (progress > 1) progress = 1;

                    let xPos = 50 + (currentImageIndex * 180);
                    let yPos = 100;
                    let size = 150;

                    // Trik Masking (Clip): Memunculkan area gambar secara perlahan dari kiri
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(xPos, yPos, size * progress, size);
                    ctx.clip();
                    ctx.drawImage(loadedImages[currentImageIndex], xPos, yPos, size, size);
                    ctx.restore();

                    // Trik Gerakan Tangan: Munculkan tangan jika gambar belum selesai 100%
                    if (progress < 1 && handImg.complete && handImg.naturalWidth !== 0) {
                        // Menggunakan rumus Sinus untuk membuat gerakan naik-turun (zigzag arsir)
                        let zigzagY = Math.sin(progress * Math.PI * 15) * 15; 
                        
                        let handX = xPos + (size * progress) - 20; // Posisi sumbu X maju ke kanan
                        let handY = yPos + (size / 2) + zigzagY;   // Posisi sumbu Y mengarsir
                        
                        // Gambar tangan (ukuran 100x100, sesuaikan jika kekecilan/kebesaran)
                        ctx.drawImage(handImg, handX, handY, 100, 100);
                    }
                }

                frame++;
                
                // Berhenti merekam jika semua gambar di antrean sudah selesai
                if (currentImageIndex >= loadedImages.length) {
                    mediaRecorder.stop();
                } else {
                    requestAnimationFrame(drawLoop); // Lanjut ke frame berikutnya
                }
            }
            drawLoop();
        }
    });
}
