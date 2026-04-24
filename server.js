const express = require("express");
const ftp = require("basic-ftp");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const multer = require("multer");

const app = express();
const PORT = 5000;

// Serve frontend files
app.use(express.static(path.join(__dirname, "public")));

// Temp CSV storage
const LOCAL_CSV = path.join(__dirname, "sales.csv");

// Multer for drag-and-drop upload
const upload = multer({ dest: "uploads/" });
app.post("/upload", upload.single("file"), (req, res) => {
    fs.renameSync(req.file.path, LOCAL_CSV);
    res.json({ success: true });
});

// --------------------
// FTP fetch function
// --------------------
async function fetchCSV() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    try {
        await client.access({
            host: "ftp.example.com",
            user: "username",
            password: "password",
            secure: false
        });
        console.log("Connected to FTP, downloading CSV...");
        await client.downloadTo(LOCAL_CSV, "remote_sales.csv");
        console.log("CSV downloaded successfully.");
    } catch (err) {
        console.error("FTP fetch error:", err);
    }
    client.close();
}

// --------------------
// Parse CSV and return JSON
// --------------------
function parseCSV() {
    if (!fs.existsSync(LOCAL_CSV)) return [];
    const content = fs.readFileSync(LOCAL_CSV, "utf8");
    return parse(content, { columns: true, skip_empty_lines: true });
}

// API endpoint for frontend
app.get("/api/sales", (req, res) => {
    const data = parseCSV();
    res.json(data);
});

// Initial FTP fetch + interval
(async () => {
    await fetchCSV();
    setInterval(fetchCSV, 10 * 60 * 1000); // fetch every 10 minutes
})();

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));