const API_KEY = 'AIzaSyDFWxSABJBNIWs1jZSG2-tShoYEXgKZNgA'; 
let arrayGambarTerpilih = []; // Tempat menyimpan gambar yang diklik user

// --- TOMBOL 1: MENCARI GAMBAR DARI INTERNET ---
document.getElementById('searchBtn').addEventListener('click', async () => {
    const scriptText = document.getElementById('scriptInput').value;
    const gallery = document.getElementById('imageGallery');
    
    if (!scriptText) return alert("Isi skripnya dulu ya!");

    document.getElementById('searchBtn').innerText = "AI sedang berpikir...";
    gallery.innerHTML = "<p>Sedang mencari gambar di internet...</p>";

    // 1. Panggil Gemini (Meminta hasil Bahasa Inggris untuk Iconify)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY.trim()}`;
    const prompt = `Bacalah skrip berikut: "${scriptText}". Ekstrak maksimal 3 kata benda visual utama. Berikan output HANYA array JSON teks polos dalam BAHASA INGGRIS, contoh: ["cat", "milk", "table"]`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7 }})
        });

        const data = await response.json();
        let keywords = ["cat", "drink", "table"]; // Fallback bawaan

        if (response.ok) {
            const responTeks = data.candidates[0].content.parts[0].text.trim();
            keywords = JSON.parse(responTeks.replace(/```json|```/g, ''));
        }

        // 2. Cari gambar di Iconify API berdasarkan bahasa Inggris
        gallery.innerHTML = ""; 
        for (let keyword of keywords) {
            const res = await fetch(`https://api.iconify.design/search?query=${keyword}&limit=4`);
            const iconData = await res.json();
            
            if (iconData.icons && iconData.icons.length > 0) {
                iconData.icons.forEach(iconName => {
                    const [prefix, name] = iconName.split(':');
                    const imgSrc = `https://api.iconify.design/${prefix}/${name}.svg?color=black`; // Paksa warna hitam ala whiteboard
                    
                    const imgEl = document.createElement('img');
                    imgEl.src = imgSrc;
                    imgEl.className = 'ikon-hasil';
                    imgEl.title = `Klik untuk memilih ${keyword}`;
                    
                    // Logika ketika gambar diklik
                    imgEl.onclick = () => pilihGambar(imgSrc);
                    gallery.appendChild(imgEl);
                });
            }
        }
        document.getElementById('searchBtn').innerText = "Selesai! Silakan pilih gambarnya";
    } catch (error) {
        gallery.innerHTML = "Gagal menghubungi internet. Coba gunakan fitur Unggah Manual.";
        document.getElementById('searchBtn').innerText = "Menganalisis Skrip & Cari Gambar";
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

function mulaiAnimasiDanRekam(daftarGambar) {
    return new Promise((resolve) => {
        const canvas = document.getElementById('whiteboardCanvas');
        const ctx = canvas.getContext('2d');
        
        // Load semua gambar terpilih ke memori
        const loadedImages = [];
        let imagesToLoad = daftarGambar.length;

        daftarGambar.forEach((src, index) => {
            const img = new Image();
            img.crossOrigin = "Anonymous"; // Mencegah error CORS dari Iconify
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
            ctx.clearRect(0, 0, canvas.width, canvas.height); 

            function drawLoop() {
                ctx.fillStyle = "#fff";
                ctx.fillRect(0, 0, canvas.width, canvas.height); 

                // Munculkan secara berurutan
                if (frame > 30 && loadedImages[0]) ctx.drawImage(loadedImages[0], 50, 100, 150, 150);
                if (frame > 90 && loadedImages[1]) ctx.drawImage(loadedImages[1], 250, 100, 150, 150);
                if (frame > 150 && loadedImages[2]) ctx.drawImage(loadedImages[2], 450, 100, 150, 150);

                frame++;
                if (frame < 240) { requestAnimationFrame(drawLoop); } 
                else { mediaRecorder.stop(); }
            }
            drawLoop();
        }
    });
}
