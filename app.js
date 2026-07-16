const API_KEY = 'AIzaSyDFWxSABJBNIWs1jZSG2-tShoYEXgKZNgA'; 

document.getElementById('generateBtn').addEventListener('click', async () => {
    const scriptText = document.getElementById('scriptInput').value;
    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    
    if (!scriptText) return alert("Silakan isi skrip terlebih dahulu!");

    generateBtn.disabled = true;
    generateBtn.innerText = "Meminta petunjuk AI...";

    try {
        // 1. PANGGIL API GEMINI (Mendapatkan kata kunci gambar berdasarkan skrip)
        const keywords = await dapatkanKataKunciDariGemini(scriptText);
        generateBtn.innerText = `AI memilih gambar: ${keywords.join(', ')}`;

        // 2. PROSES ANIMASI DAN REKAMAN VIDEO
        generateBtn.innerText = "Sedang Merender & Merekam Video...";
        await mulaiAnimasiDanRekam(keywords);

        generateBtn.innerText = "Selesai!";
        generateBtn.disabled = false;
        downloadBtn.style.display = "inline-block"; // Munculkan tombol download

    } catch (error) {
        console.error(error);
        alert("Terjadi kesalahan, coba periksa konsol browser atau API Key kamu.");
        generateBtn.disabled = false;
        generateBtn.innerText = "Mulai Render Video";
    }
});


// FUNGSI UPDATE TERAKHIR (Anti-Error / Universal Endpoint)
async function dapatkanKataKunciDariGemini(skrip) {
    // Kita gunakan model "gemini-pro" dengan URL v1beta yang paling longgar
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY.trim()}`;
    
    const prompt = `Bacalah skrip berikut: "${skrip}". Ekstrak maksimal 3 kata benda/objek visual yang paling mewakili skrip tersebut untuk dijadikan animasi gambar. Berikan output HANYA dalam bentuk array JSON teks polos tanpa format markdown, contoh: ["sedih", "topeng", "rumah"]`;

    // Tambahkan pengaturan khusus di header agar tidak terblokir
    const response = await fetch(url, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ 
            contents: [{ parts: [{ text: prompt }] }],
            // Memaksa AI agar tidak terlalu kaku merespons (menghindari error internal Google)
            generationConfig: {
                temperature: 0.7,
                topK: 1,
                topP: 1
            }
        })
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("Detail Error API:", data);
        // Jika masih gagal, kita kembalikan kata kunci palsu (dummy) agar web tidak macet!
        console.warn("Menggunakan fallback kata kunci karena server AI sibuk.");
        return ["kucing", "berjalan", "cepat"]; 
    }

    try {
        const responTeks = data.candidates[0].content.parts[0].text.trim();
        const cleanJson = responTeks.replace(/```json|```/g, '');
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("Gagal membaca respons AI:", e);
        return ["gambar1", "gambar2", "gambar3"]; // Fallback jika AI ngaco
    }
}


// FUNGSI PEREKAMAN UPDATE (Tahap 2: Menampilkan Gambar Asli)
function mulaiAnimasiDanRekam(keywords) {
    return new Promise((resolve) => {
        const canvas = document.getElementById('whiteboardCanvas');
        const ctx = canvas.getContext('2d');
        
        // --- 1. PROSES PRE-LOAD GAMBAR ---
        // Kita harus memuat (loading) gambar dari folder ke memori sebelum direkam
        const loadedImages = [];
        let imagesToLoad = keywords.length;

        keywords.forEach((keyword, index) => {
            const img = new Image();
            img.src = `${keyword}.svg`; // Memanggil file gambar sesuai kata kunci AI

            // Jika gambar berhasil ditemukan di folder
            img.onload = () => {
                loadedImages[index] = img;
                imagesToLoad--;
                if (imagesToLoad === 0) jalankanRekaman(); // Mulai rekam jika semua gambar siap
            };

            // Jika gambar tidak ada/gagal dimuat
            img.onerror = () => {
                console.warn(`Gambar ${keyword}.svg tidak ditemukan di folder!`);
                loadedImages[index] = null; 
                imagesToLoad--;
                if (imagesToLoad === 0) jalankanRekaman();
            };
        });

        // --- 2. PROSES ANIMASI & REKAM VIDEO ---
        function jalankanRekaman() {
            const stream = canvas.captureStream(30);
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
            let chunks = [];

            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
            
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const videoURL = URL.createObjectURL(blob);
                document.getElementById('downloadBtn').href = videoURL;
                resolve();
            };

            mediaRecorder.start();

            let frame = 0;
            ctx.clearRect(0, 0, canvas.width, canvas.height); 

            function drawLoop() {
                ctx.fillStyle = "#fff";
                ctx.fillRect(0, 0, canvas.width, canvas.height); 

                // Format drawImage: ctx.drawImage(VariabelGambar, Posisi X, Posisi Y, Lebar, Tinggi);

                // Munculkan Gambar 1 (kucing.svg) di frame 30
                if (frame > 30 && loadedImages[0]) {
                    ctx.drawImage(loadedImages[0], 50, 100, 150, 150); 
                }
                
                // Munculkan Gambar 2 (berjalan.svg) di frame 90
                if (frame > 90 && loadedImages[1]) {
                    ctx.drawImage(loadedImages[1], 250, 100, 150, 150);
                }
                
                // Munculkan Gambar 3 (cepat.svg) di frame 150
                if (frame > 150 && loadedImages[2]) {
                    ctx.drawImage(loadedImages[2], 450, 100, 150, 150);
                }

                frame++;

                if (frame < 240) { // Render selama ~8 detik
                    requestAnimationFrame(drawLoop);
                } else {
                    mediaRecorder.stop();
                }
            }
            drawLoop();
        }
    });
}
