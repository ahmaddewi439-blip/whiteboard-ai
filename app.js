const API_KEY = 'AIzaSyA0uf4GrrZqsQK6-aDI8AFYde0G4TWg9_Q'; 

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


// Fungsi untuk meminta Gemini mengekstrak kata kunci gambar (VERSI UPDATE)
async function dapatkanKataKunciDariGemini(skrip) {
    // Kita tambahkan "-latest" di nama modelnya agar selalu menggunakan versi yang tersedia
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`;
    
    const prompt = `Bacalah skrip berikut: "${skrip}". Ekstrak maksimal 3 kata benda/objek visual yang paling mewakili skrip tersebut untuk dijadikan animasi gambar. Berikan output HANYA dalam bentuk array JSON teks polos tanpa format markdown, contoh: ["sedih", "topeng", "rumah"]`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();

    // 🚨 PENANGANAN ERROR BARU: Jika Google mengembalikan error (seperti 404)
    if (!response.ok) {
        console.error("Detail Error dari Google API:", data); // Menampilkan alasan asli di konsol
        throw new Error(data.error?.message || "Gagal menghubungi server AI Google.");
    }

    const responTeks = data.candidates[0].content.parts[0].text.trim();
    
    // Bersihkan jika AI tidak sengaja memberikan format markdown
    const cleanJson = responTeks.replace(/```json|```/g, '');
    return JSON.parse(cleanJson);
}

// Fungsi Perekaman menggunakan MediaRecorder API
function mulaiAnimasiDanRekam(keywords) {
    return new Promise((resolve) => {
        const canvas = document.getElementById('whiteboardCanvas');
        const ctx = canvas.getContext('2d');
        
        // Setup Perekam Layar Canvas (30 FPS)
        const stream = canvas.captureStream(30);
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        let chunks = [];

        mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        
        mediaRecorder.onstop = () => {
            // Mengubah rekaman mentah menjadi file video download siap pakai
            const blob = new Blob(chunks, { type: 'video/webm' });
            const videoURL = URL.createObjectURL(blob);
            document.getElementById('downloadBtn').href = videoURL;
            resolve();
        };

        // Mulai Merekam
        mediaRecorder.start();

        // LOGIKA ANIMASI SEDERHANA (Tahap Pertama: Simulasi Menulis Teks Gambar)
        let frame = 0;
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Bersihkan kanvas awal

        function drawLoop() {
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, canvas.width, canvas.height); // Background putih

            ctx.fillStyle = "#333";
            ctx.font = "24px Arial";
            
            // Menggambar simulasi tulisan keyword di kanvas seiring berjalannya waktu (Max 10 detik / 300 frame)
            if (frame > 30 && keywords[0]) ctx.fillText(`✍️ [Menggambar: ${keywords[0]}]`, 50, 100);
            if (frame > 90 && keywords[1]) ctx.fillText(`✍️ [Menggambar: ${keywords[1]}]`, 50, 180);
            if (frame > 150 && keywords[2]) ctx.fillText(`✍️ [Menggambar: ${keywords[2]}]`, 50, 260);

            frame++;

            if (frame < 240) { // Batasi sekitar 8 detik durasi render
                requestAnimationFrame(drawLoop);
            } else {
                mediaRecorder.stop(); // Berhenti merekam setelah durasi habis
            }
        }

        drawLoop();
    });
}