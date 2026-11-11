// ============================================================================
// Baseline (No-AI) Frontend Logic — Skin Lesion Triage Study
// ============================================================================

// Configure your Python Backend API URL here (live Render backend)
const BACKEND_API_URL = window.BACKEND_API_URL || "https://hai-assignment3-backend.onrender.com";
const NUM_STUDY_TRIALS = 10; // 10 real trials + 1 attention check = 11 total

// Warm up Render backend in the background while participant reads instructions
fetch(`${BACKEND_API_URL}/api/health`).catch(() => {});

let participantId = "";
let trials = []; // Array of 11 trial objects (10 real + 1 attention check)
let currentIndex = 0;
let studyStartTime = null;
let currentTrialStartTime = null;
let lastSubmissionPayload = null;

// DOM Elements
const startModal = document.getElementById("start-modal");
const surveyModal = document.getElementById("survey-modal");
const completeModal = document.getElementById("complete-modal");
const generatedIdEl = document.getElementById("generated-participant-id");
const startStudyBtn = document.getElementById("start-study-btn");

// Generate a random Participant ID immediately on load
function generateParticipantId() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `P-${code}`;
}

participantId = generateParticipantId();
if (generatedIdEl) {
    generatedIdEl.textContent = participantId;
}

const progressBadge = document.getElementById("progress-badge");
const trialTitle = document.getElementById("trial-title");
const selectionStatus = document.getElementById("selection-status");
const attentionBanner = document.getElementById("attention-banner");
const currentTrialImage = document.getElementById("current-trial-image");

const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const btnMalignant = document.getElementById("btn-malignant");
const btnBenign = document.getElementById("btn-benign");
const btnDefer = document.getElementById("btn-defer");
const decisionButtons = [btnMalignant, btnBenign, btnDefer];

const submitStudyBtn = document.getElementById("submit-study-btn");
const surveyError = document.getElementById("survey-error");
const submissionStatusMsg = document.getElementById("submission-status-msg");
const summaryStats = document.getElementById("summary-stats");
const downloadBackupBtn = document.getElementById("download-backup-btn");

// 1. Parse CSV fallback (used if Python backend is not running yet)
function parseCSV(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    const headers = lines[0].split(",").map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const vals = lines[i].split(",").map(v => v.trim());
        const obj = {};
        headers.forEach((h, idx) => {
            obj[h] = vals[idx];
        });
        rows.push(obj);
    }
    return rows;
}

// 2. Load 10 Random Trials + 1 Attention Check
async function loadStudyTrials() {
    let sampledRows = [];

    // First try loading from Python backend
    try {
        const res = await fetch(`${BACKEND_API_URL}/api/trials?condition=no_ai&n=${NUM_STUDY_TRIALS}`);
        if (res.ok) {
            const data = await res.json();
            sampledRows = data.trials;
        } else {
            throw new Error("Backend returned non-200");
        }
    } catch (err) {
        // Fallback: load from local CSV or embedded study metadata (works even via file://)
        let allRows = [];
        try {
            const csvRes = await fetch("study_dataset_metadata.csv");
            const csvText = await csvRes.text();
            allRows = parseCSV(csvText);
        } catch (e) {
            allRows = [{"img_id": "PAT_354_1814_153.png", "fitzpatrick": "2.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.6441"}, {"img_id": "PAT_81_123_52.png", "fitzpatrick": "3.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "0", "ai_confidence": "0.8395"}, {"img_id": "PAT_641_3704_317.png", "fitzpatrick": "2.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.9871"}, {"img_id": "PAT_961_1818_992.png", "fitzpatrick": "4.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.8189"}, {"img_id": "PAT_194_298_945.png", "fitzpatrick": "4.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.2593"}, {"img_id": "PAT_92_141_551.png", "fitzpatrick": "4.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.9642"}, {"img_id": "PAT_215_330_341.png", "fitzpatrick": "1.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.921"}, {"img_id": "PAT_100_393_595.png", "fitzpatrick": "1.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.9783"}, {"img_id": "PAT_707_1327_245.png", "fitzpatrick": "5.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "0", "ai_confidence": "0.9007"}, {"img_id": "PAT_622_1185_922.png", "fitzpatrick": "2.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.7058"}, {"img_id": "PAT_471_909_353.png", "fitzpatrick": "2.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.9892"}, {"img_id": "PAT_788_1503_541.png", "fitzpatrick": "4.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.7947"}, {"img_id": "PAT_183_283_602.png", "fitzpatrick": "3.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.6657"}, {"img_id": "PAT_788_1503_168.png", "fitzpatrick": "4.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.4471"}, {"img_id": "PAT_940_1774_962.png", "fitzpatrick": "2.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.9173"}, {"img_id": "PAT_359_741_966.png", "fitzpatrick": "3.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.8286"}, {"img_id": "PAT_61_299_74.png", "fitzpatrick": "3.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.2626"}, {"img_id": "PAT_486_929_274.png", "fitzpatrick": "2.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.862"}, {"img_id": "PAT_313_669_935.png", "fitzpatrick": "2.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.9525"}, {"img_id": "PAT_687_1304_898.png", "fitzpatrick": "5.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.693"}, {"img_id": "PAT_197_301_198.png", "fitzpatrick": "4.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "0", "ai_confidence": "0.8564"}, {"img_id": "PAT_248_379_695.png", "fitzpatrick": "2.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.9652"}, {"img_id": "PAT_373_2598_235.png", "fitzpatrick": "4.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.8228"}, {"img_id": "PAT_754_1429_380.png", "fitzpatrick": "2.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.8215"}, {"img_id": "PAT_433_852_20.png", "fitzpatrick": "2.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "0", "ai_confidence": "0.954"}, {"img_id": "PAT_420_834_948.png", "fitzpatrick": "4.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.2808"}, {"img_id": "PAT_893_1697_613.png", "fitzpatrick": "5.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.861"}, {"img_id": "PAT_352_729_947.png", "fitzpatrick": "5.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.9195"}, {"img_id": "PAT_340_714_314.png", "fitzpatrick": "4.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.7847"}, {"img_id": "PAT_632_1206_637.png", "fitzpatrick": "2.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.7954"}, {"img_id": "PAT_206_312_760.png", "fitzpatrick": "2.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.4025"}, {"img_id": "PAT_294_638_564.png", "fitzpatrick": "4.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.9902"}, {"img_id": "PAT_233_354_935.png", "fitzpatrick": "2.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "0", "ai_confidence": "0.8068"}, {"img_id": "PAT_328_692_681.png", "fitzpatrick": "4.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.9468"}, {"img_id": "PAT_738_1552_502.png", "fitzpatrick": "2.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.3409"}, {"img_id": "PAT_198_853_778.png", "fitzpatrick": "2.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.9685"}, {"img_id": "PAT_587_3431_6.png", "fitzpatrick": "3.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "0", "ai_confidence": "0.9531"}, {"img_id": "PAT_704_1323_974.png", "fitzpatrick": "2.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.3277"}, {"img_id": "PAT_181_833_109.png", "fitzpatrick": "4.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.3831"}, {"img_id": "PAT_601_1147_889.png", "fitzpatrick": "4.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.8768"}, {"img_id": "PAT_67_104_730.png", "fitzpatrick": "5.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.9728"}, {"img_id": "PAT_67_104_695.png", "fitzpatrick": "5.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.867"}, {"img_id": "PAT_801_1518_574.png", "fitzpatrick": "4.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "0", "ai_confidence": "0.848"}, {"img_id": "PAT_419_833_148.png", "fitzpatrick": "2.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.8634"}, {"img_id": "PAT_756_1496_480.png", "fitzpatrick": "4.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.907"}, {"img_id": "PAT_230_350_872.png", "fitzpatrick": "2.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.9767"}, {"img_id": "PAT_87_133_159.png", "fitzpatrick": "3.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.8023"}, {"img_id": "PAT_751_1497_215.png", "fitzpatrick": "2.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "0", "ai_confidence": "0.9325"}, {"img_id": "PAT_439_2887_834.png", "fitzpatrick": "4.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.8436"}, {"img_id": "PAT_701_1321_156.png", "fitzpatrick": "2.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.5342"}, {"img_id": "PAT_612_1163_833.png", "fitzpatrick": "1.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.9429"}, {"img_id": "PAT_338_709_306.png", "fitzpatrick": "1.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.6381"}, {"img_id": "PAT_573_1090_164.png", "fitzpatrick": "4.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.405"}, {"img_id": "PAT_197_301_449.png", "fitzpatrick": "4.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.5"}, {"img_id": "PAT_796_1510_130.png", "fitzpatrick": "2.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.6634"}, {"img_id": "PAT_286_1458_381.png", "fitzpatrick": "2.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "0", "ai_confidence": "0.9491"}, {"img_id": "PAT_719_1361_160.png", "fitzpatrick": "2.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.8563"}, {"img_id": "PAT_93_361_203.png", "fitzpatrick": "4.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.3514"}, {"img_id": "PAT_528_992_124.png", "fitzpatrick": "2.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "0", "ai_confidence": "0.8623"}, {"img_id": "PAT_201_306_781.png", "fitzpatrick": "3.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.9628"}, {"img_id": "PAT_689_1307_354.png", "fitzpatrick": "2.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.8119"}, {"img_id": "PAT_414_822_420.png", "fitzpatrick": "4.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.6558"}, {"img_id": "PAT_859_1638_598.png", "fitzpatrick": "3.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.4907"}, {"img_id": "PAT_600_1141_542.png", "fitzpatrick": "2.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.9704"}, {"img_id": "PAT_87_133_810.png", "fitzpatrick": "3.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.7701"}, {"img_id": "PAT_302_650_477.png", "fitzpatrick": "2.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.9243"}, {"img_id": "PAT_701_4056_457.png", "fitzpatrick": "2.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.5342"}, {"img_id": "PAT_792_1498_936.png", "fitzpatrick": "5.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.7796"}, {"img_id": "PAT_420_834_450.png", "fitzpatrick": "4.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.4235"}, {"img_id": "PAT_100_393_898.png", "fitzpatrick": "1.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.3284"}, {"img_id": "PAT_650_3858_329.png", "fitzpatrick": "2.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.9475"}, {"img_id": "PAT_93_361_467.png", "fitzpatrick": "4.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.7814"}, {"img_id": "PAT_115_1138_870.png", "fitzpatrick": "2.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.9193"}, {"img_id": "PAT_180_756_831.png", "fitzpatrick": "3.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.6102"}, {"img_id": "PAT_465_901_627.png", "fitzpatrick": "2.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.9657"}, {"img_id": "PAT_417_3537_45.png", "fitzpatrick": "3.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.6784"}, {"img_id": "PAT_653_1234_311.png", "fitzpatrick": "2.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.9045"}, {"img_id": "PAT_787_1482_328.png", "fitzpatrick": "4.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.6353"}, {"img_id": "PAT_373_2598_514.png", "fitzpatrick": "4.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.7826"}, {"img_id": "PAT_109_868_113.png", "fitzpatrick": "2.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "0", "ai_confidence": "0.9931"}, {"img_id": "PAT_663_1254_732.png", "fitzpatrick": "3.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.7017"}, {"img_id": "PAT_851_4520_743.png", "fitzpatrick": "3.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.4867"}, {"img_id": "PAT_373_761_708.png", "fitzpatrick": "4.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.9474"}, {"img_id": "PAT_680_1289_182.png", "fitzpatrick": "2.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "0", "ai_confidence": "0.792"}, {"img_id": "PAT_403_804_994.png", "fitzpatrick": "4.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.8266"}, {"img_id": "PAT_419_2768_910.png", "fitzpatrick": "2.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.5604"}, {"img_id": "PAT_93_361_51.png", "fitzpatrick": "4.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.3388"}, {"img_id": "PAT_770_1451_136.png", "fitzpatrick": "5.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.816"}, {"img_id": "PAT_324_1465_43.png", "fitzpatrick": "2.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.8213"}, {"img_id": "PAT_756_1496_599.png", "fitzpatrick": "4.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.9386"}, {"img_id": "PAT_792_4351_858.png", "fitzpatrick": "5.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.8977"}, {"img_id": "PAT_614_1166_885.png", "fitzpatrick": "3.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.8537"}, {"img_id": "PAT_291_446_704.png", "fitzpatrick": "4.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.4109"}, {"img_id": "PAT_793_1512_513.png", "fitzpatrick": "4.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.9936"}, {"img_id": "PAT_504_953_569.png", "fitzpatrick": "2.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.573"}, {"img_id": "PAT_719_1361_234.png", "fitzpatrick": "2.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.9643"}, {"img_id": "PAT_354_1814_726.png", "fitzpatrick": "2.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.3837"}, {"img_id": "PAT_942_1792_411.png", "fitzpatrick": "4.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.4002"}, {"img_id": "PAT_974_1842_574.png", "fitzpatrick": "3.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.8333"}, {"img_id": "PAT_482_2928_201.png", "fitzpatrick": "2.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.8766"}, {"img_id": "PAT_995_1867_5.png", "fitzpatrick": "2.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.3301"}, {"img_id": "PAT_319_680_166.png", "fitzpatrick": "2.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.4451"}, {"img_id": "PAT_906_1722_328.png", "fitzpatrick": "2.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.9583"}, {"img_id": "PAT_439_859_84.png", "fitzpatrick": "4.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.9742"}, {"img_id": "PAT_763_1439_668.png", "fitzpatrick": "4.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.5764"}, {"img_id": "PAT_715_4072_827.png", "fitzpatrick": "2.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.501"}, {"img_id": "PAT_818_1539_859.png", "fitzpatrick": "2.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.5385"}, {"img_id": "PAT_957_1814_77.png", "fitzpatrick": "2.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.8031"}, {"img_id": "PAT_341_715_180.png", "fitzpatrick": "4.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.971"}, {"img_id": "PAT_949_1802_582.png", "fitzpatrick": "3.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.5822"}, {"img_id": "PAT_486_929_317.png", "fitzpatrick": "2.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.2556"}, {"img_id": "PAT_357_737_77.png", "fitzpatrick": "2.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.9947"}, {"img_id": "PAT_793_1512_382.png", "fitzpatrick": "4.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.8972"}, {"img_id": "PAT_492_4723_890.png", "fitzpatrick": "2.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.9631"}, {"img_id": "PAT_793_1512_327.png", "fitzpatrick": "4.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.5629"}, {"img_id": "PAT_45_66_822.png", "fitzpatrick": "2.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.4646"}, {"img_id": "PAT_210_316_401.png", "fitzpatrick": "3.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.2755"}, {"img_id": "PAT_897_1704_988.png", "fitzpatrick": "2.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.3071"}, {"img_id": "PAT_365_750_854.png", "fitzpatrick": "2.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "0", "ai_confidence": "0.7845"}, {"img_id": "PAT_715_1339_508.png", "fitzpatrick": "2.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.831"}, {"img_id": "PAT_917_1735_936.png", "fitzpatrick": "2.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.2887"}, {"img_id": "PAT_225_345_903.png", "fitzpatrick": "4.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.923"}, {"img_id": "PAT_616_1169_3.png", "fitzpatrick": "4.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.944"}, {"img_id": "PAT_590_1121_504.png", "fitzpatrick": "5.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.9537"}, {"img_id": "PAT_566_179_23.png", "fitzpatrick": "3.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.7357"}, {"img_id": "PAT_758_1441_891.png", "fitzpatrick": "3.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.95"}, {"img_id": "PAT_605_1152_536.png", "fitzpatrick": "3.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.4062"}, {"img_id": "PAT_181_280_417.png", "fitzpatrick": "4.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.8189"}, {"img_id": "PAT_55_85_884.png", "fitzpatrick": "1.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.9732"}, {"img_id": "PAT_354_1817_500.png", "fitzpatrick": "2.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.9969"}, {"img_id": "PAT_935_1785_530.png", "fitzpatrick": "2.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.3086"}, {"img_id": "PAT_884_1683_538.png", "fitzpatrick": "3.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.9523"}, {"img_id": "PAT_265_1371_303.png", "fitzpatrick": "2.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.7963"}, {"img_id": "PAT_354_1814_619.png", "fitzpatrick": "2.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.8613"}, {"img_id": "PAT_262_402_14.png", "fitzpatrick": "2.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.8319"}, {"img_id": "PAT_710_1330_243.png", "fitzpatrick": "3.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "0", "ai_confidence": "0.8278"}, {"img_id": "PAT_801_1518_78.png", "fitzpatrick": "4.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.369"}, {"img_id": "PAT_256_394_449.png", "fitzpatrick": "1.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.9376"}, {"img_id": "PAT_876_1664_579.png", "fitzpatrick": "2.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.9988"}, {"img_id": "PAT_895_1699_872.png", "fitzpatrick": "2.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.2667"}, {"img_id": "PAT_227_347_19.png", "fitzpatrick": "2.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.3446"}, {"img_id": "PAT_966_1825_584.png", "fitzpatrick": "3.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "0", "ai_confidence": "0.84"}, {"img_id": "PAT_388_1592_850.png", "fitzpatrick": "1.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.2544"}, {"img_id": "PAT_872_1707_638.png", "fitzpatrick": "2.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.7048"}, {"img_id": "PAT_656_1246_489.png", "fitzpatrick": "2.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.4969"}, {"img_id": "PAT_72_110_944.png", "fitzpatrick": "2.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.9065"}, {"img_id": "PAT_433_2650_417.png", "fitzpatrick": "2.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.9671"}, {"img_id": "PAT_756_1495_858.png", "fitzpatrick": "4.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.2979"}, {"img_id": "PAT_202_916_612.png", "fitzpatrick": "3.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.6245"}, {"img_id": "PAT_439_859_283.png", "fitzpatrick": "4.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.9272"}, {"img_id": "PAT_600_1141_988.png", "fitzpatrick": "2.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "0", "ai_confidence": "0.7606"}, {"img_id": "PAT_406_808_560.png", "fitzpatrick": "3.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.7434"}, {"img_id": "PAT_38_1003_68.png", "fitzpatrick": "1.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.4929"}, {"img_id": "PAT_462_896_893.png", "fitzpatrick": "3.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.9902"}, {"img_id": "PAT_244_374_726.png", "fitzpatrick": "4.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.3268"}, {"img_id": "PAT_260_400_566.png", "fitzpatrick": "1.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.9447"}, {"img_id": "PAT_931_1763_617.png", "fitzpatrick": "2.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.4044"}, {"img_id": "PAT_260_400_842.png", "fitzpatrick": "1.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.9855"}, {"img_id": "PAT_188_289_859.png", "fitzpatrick": "4.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.8945"}, {"img_id": "PAT_194_298_367.png", "fitzpatrick": "4.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.979"}, {"img_id": "PAT_615_1168_968.png", "fitzpatrick": "2.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.9763"}, {"img_id": "PAT_166_3672_759.png", "fitzpatrick": "2.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.7947"}, {"img_id": "PAT_333_702_840.png", "fitzpatrick": "3.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "0", "ai_confidence": "0.9752"}, {"img_id": "PAT_649_1233_229.png", "fitzpatrick": "6.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.5049"}, {"img_id": "PAT_320_681_410.png", "fitzpatrick": "3.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "0", "ai_confidence": "0.7835"}, {"img_id": "PAT_522_3168_747.png", "fitzpatrick": "2.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.9518"}, {"img_id": "PAT_717_1347_899.png", "fitzpatrick": "2.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "0", "ai_confidence": "0.8206"}, {"img_id": "PAT_70_107_155.png", "fitzpatrick": "2.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.5312"}, {"img_id": "PAT_93_361_231.png", "fitzpatrick": "4.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.7731"}, {"img_id": "PAT_328_1738_890.png", "fitzpatrick": "4.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.7047"}, {"img_id": "PAT_233_354_828.png", "fitzpatrick": "2.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.2747"}, {"img_id": "PAT_817_1537_943.png", "fitzpatrick": "2.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "0", "ai_confidence": "0.7691"}, {"img_id": "PAT_834_1574_276.png", "fitzpatrick": "2.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.4188"}, {"img_id": "PAT_387_786_782.png", "fitzpatrick": "2.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.8017"}, {"img_id": "PAT_320_681_724.png", "fitzpatrick": "3.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "0", "ai_confidence": "0.8967"}, {"img_id": "PAT_890_1693_904.png", "fitzpatrick": "2.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "0", "ai_confidence": "0.8786"}, {"img_id": "PAT_958_1812_62.png", "fitzpatrick": "3.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.394"}, {"img_id": "PAT_492_937_126.png", "fitzpatrick": "2.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.8442"}, {"img_id": "PAT_256_295_583.png", "fitzpatrick": "1.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.9667"}, {"img_id": "PAT_263_1480_753.png", "fitzpatrick": "1.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.3993"}, {"img_id": "PAT_181_832_158.png", "fitzpatrick": "4.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.9358"}, {"img_id": "PAT_93_361_53.png", "fitzpatrick": "4.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.7411"}, {"img_id": "PAT_950_1804_64.png", "fitzpatrick": "4.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.7779"}, {"img_id": "PAT_924_1757_704.png", "fitzpatrick": "3.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.2996"}, {"img_id": "PAT_785_1479_108.png", "fitzpatrick": "4.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.89"}, {"img_id": "PAT_168_1486_97.png", "fitzpatrick": "2.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.6455"}, {"img_id": "PAT_267_1258_693.png", "fitzpatrick": "2.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.5656"}, {"img_id": "PAT_236_361_180.png", "fitzpatrick": "3.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.879"}, {"img_id": "PAT_532_3216_633.png", "fitzpatrick": "2.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.9512"}, {"img_id": "PAT_219_336_376.png", "fitzpatrick": "2.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "0", "ai_confidence": "0.8616"}, {"img_id": "PAT_270_1387_430.png", "fitzpatrick": "1.0", "diagnostic": "SEK", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "1", "ai_confidence": "0.5369"}, {"img_id": "PAT_936_1772_886.png", "fitzpatrick": "2.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.3552"}, {"img_id": "PAT_398_799_163.png", "fitzpatrick": "3.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.9026"}, {"img_id": "PAT_573_1090_660.png", "fitzpatrick": "4.0", "diagnostic": "BCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "0", "ai_confidence": "0.7512"}, {"img_id": "PAT_621_1182_456.png", "fitzpatrick": "3.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.8606"}, {"img_id": "PAT_93_142_269.png", "fitzpatrick": "4.0", "diagnostic": "SCC", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.4223"}, {"img_id": "PAT_983_1853_985.png", "fitzpatrick": "2.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.4467"}, {"img_id": "PAT_595_1142_142.png", "fitzpatrick": "2.0", "diagnostic": "ACK", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.5442"}, {"img_id": "PAT_340_714_68.png", "fitzpatrick": "4.0", "diagnostic": "MEL", "ground_truth": "1", "binary_label": "Malignant", "ai_prediction": "1", "ai_confidence": "0.8597"}, {"img_id": "PAT_900_1711_622.png", "fitzpatrick": "3.0", "diagnostic": "NEV", "ground_truth": "0", "binary_label": "Benign", "ai_prediction": "0", "ai_confidence": "0.9838"}];
        }

        // Shuffle using Fisher-Yates and pick NUM_STUDY_TRIALS (10)
        const shuffled = [...allRows];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        sampledRows = shuffled.slice(0, NUM_STUDY_TRIALS);
    }

    // Build trial objects and insert Attention Check at index 5 (Trial 6 of 11)
    const builtTrials = sampledRows.map(row => ({
        img_id: row.img_id,
        fitzpatrick: parseFloat(row.fitzpatrick),
        diagnostic: row.diagnostic,
        ground_truth: parseInt(row.ground_truth, 10),
        binary_label: row.binary_label,
        is_attention_check: false,
        user_action: null,      // 'malignant', 'benign', or 'defer'
        final_decision: null,   // 'malignant', 'benign', or 'defer'
        response_time_seconds: 0
    }));

    const attentionTrial = {
        img_id: sampledRows[0] ? sampledRows[0].img_id : "example_images/example_nv.jpg",
        fitzpatrick: null,
        diagnostic: "ATTENTION_CHECK",
        ground_truth: null,
        binary_label: "Attention Check",
        is_attention_check: true,
        user_action: null,
        final_decision: null,
        response_time_seconds: 0
    };

    builtTrials.splice(5, 0, attentionTrial);
    trials = builtTrials.map((t, idx) => ({ ...t, trial_index: idx + 1 }));
}

// 3. Record elapsed time on current trial before switching
function recordElapsedForCurrentTrial() {
    if (currentTrialStartTime !== null && trials[currentIndex]) {
        const elapsedSec = ( performance.now() - currentTrialStartTime ) / 1000.0;
        trials[currentIndex].response_time_seconds = parseFloat(
            (trials[currentIndex].response_time_seconds + elapsedSec).toFixed(2)
        );
    }
    currentTrialStartTime = performance.now();
}

// 4. Render Current Trial
function renderTrial() {
    const trial = trials[currentIndex];
    if (!trial) return;

    progressBadge.textContent = `Image ${currentIndex + 1} of ${trials.length}`;
    trialTitle.textContent = trial.is_attention_check
        ? `Current Medical Image (Trial ${currentIndex + 1} — Attention Check)`
        : `Current Medical Image (Trial ${currentIndex + 1})`;

    // Show/hide attention check instructions
    if (trial.is_attention_check) {
        attentionBanner.classList.remove("hidden");
    } else {
        attentionBanner.classList.add("hidden");
    }

    // Set image source
    const imgSrc = trial.img_id.startsWith("example_images/")
        ? trial.img_id
        : `study_images/${trial.img_id}`;
    currentTrialImage.src = imgSrc;

    // Update decision buttons & status pill
    updateSelectionUI(trial.user_action);

    // Update Prev / Next buttons
    prevBtn.disabled = currentIndex === 0;
    if (currentIndex === trials.length - 1) {
        nextBtn.innerHTML = "Finish &amp; Submit &rarr;";
    } else {
        nextBtn.innerHTML = "Next Image &rarr;";
    }
    nextBtn.disabled = !trial.user_action;

    // Reset timer for this trial view
    currentTrialStartTime = performance.now();
}

// 5. Update Button Highlight & Status Pill
function updateSelectionUI(choice) {
    decisionButtons.forEach(btn => {
        if (btn.dataset.choice === choice) {
            btn.classList.add("selected");
        } else {
            btn.classList.remove("selected");
        }
    });

    selectionStatus.className = "status-pill";
    if (!choice) {
        selectionStatus.classList.add("status-unselected");
        selectionStatus.textContent = "No decision selected yet";
    } else if (choice === "malignant") {
        selectionStatus.classList.add("status-malignant");
        selectionStatus.textContent = "Selected: Malignant";
    } else if (choice === "benign") {
        selectionStatus.classList.add("status-benign");
        selectionStatus.textContent = "Selected: Benign";
    } else if (choice === "defer") {
        selectionStatus.classList.add("status-defer");
        selectionStatus.textContent = "Selected: Defer (Unclear Image)";
    }
}

// 6. Handle Decision Button Click
decisionButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        const choice = btn.dataset.choice;
        const trial = trials[currentIndex];
        trial.user_action = choice;
        trial.final_decision = choice;

        updateSelectionUI(choice);
        nextBtn.disabled = false;
    });
});

// 7. Handle Prev / Next Navigation
prevBtn.addEventListener("click", () => {
    if (currentIndex > 0) {
        recordElapsedForCurrentTrial();
        currentIndex--;
        renderTrial();
    }
});

nextBtn.addEventListener("click", () => {
    const trial = trials[currentIndex];
    if (!trial.user_action) return;

    recordElapsedForCurrentTrial();

    if (currentIndex < trials.length - 1) {
        currentIndex++;
        renderTrial();
    } else {
        // Reached the end of all 11 trials -> Open Post-Study Survey
        currentTrialStartTime = null;
        surveyModal.classList.remove("hidden");
    }
});

// 8. Start Study Button
startStudyBtn.addEventListener("click", async () => {
    startStudyBtn.disabled = true;
    startStudyBtn.textContent = "Loading Trials...";

    await loadStudyTrials();
    studyStartTime = performance.now();
    startModal.classList.add("hidden");
    renderTrial();
});

// 9. Submit Study & Survey to Backend (Supabase)
submitStudyBtn.addEventListener("click", async () => {
    const confEl = document.querySelector('input[name="confidence"]:checked');
    const diffEl = document.querySelector('input[name="difficulty"]:checked');

    if (!confEl || !diffEl) {
        surveyError.classList.remove("hidden");
        return;
    }
    surveyError.classList.add("hidden");

    const totalDurationSeconds = parseFloat(((performance.now() - studyStartTime) / 1000.0).toFixed(2));
    const attentionTrial = trials.find(t => t.is_attention_check);
    const attentionPassed = attentionTrial ? attentionTrial.final_decision === "defer" : true;

    // Compute correctness for each trial
    const formattedTrials = trials.map(t => {
        let isCorrect = null;
        if (!t.is_attention_check && t.final_decision !== "defer") {
            const predictedInt = t.final_decision === "malignant" ? 1 : 0;
            isCorrect = predictedInt === t.ground_truth;
        }
        return {
            ...t,
            is_correct: isCorrect
        };
    });

    const payload = {
        participant_id: participantId,
        condition: "no_ai",
        total_trials: trials.length,
        attention_check_passed: attentionPassed,
        total_duration_seconds: totalDurationSeconds,
        perceived_confidence: parseInt(confEl.value, 10),
        perceived_difficulty: parseInt(diffEl.value, 10),
        perceived_ai_helpfulness: null,
        comments: document.getElementById("survey-comments").value.trim(),
        trials: formattedTrials
    };

    lastSubmissionPayload = payload;
    submitStudyBtn.disabled = true;
    submitStudyBtn.textContent = "Submitting...";

    try {
        const res = await fetch(`${BACKEND_API_URL}/api/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        submissionStatusMsg.textContent = "Your responses have been saved to the Supabase database!";
    } catch (err) {
        console.warn("Backend not reachable; saved locally for backup download:", err);
        submissionStatusMsg.textContent =
            "Note: Could not reach the live backend server, so please click the Download button below to save your results file.";
    }

    // Show summary statistics on completion screen
    const realTrials = formattedTrials.filter(t => !t.is_attention_check);
    const evaluatedTrials = realTrials.filter(t => t.final_decision !== "defer");
    const deferredCount = realTrials.filter(t => t.final_decision === "defer").length;
    const correctCount = evaluatedTrials.filter(t => t.is_correct).length;

    summaryStats.innerHTML = `
        <strong>Participant:</strong> ${participantId}<br>
        <strong>Condition:</strong> Baseline (Without AI)<br>
        <strong>Evaluated Decisions Correct:</strong> ${correctCount} / ${evaluatedTrials.length} (${deferredCount} deferred)<br>
        <strong>Attention Check:</strong> ${attentionPassed ? "Passed" : "Missed"}<br>
        <strong>Total Time:</strong> ${totalDurationSeconds} seconds
    `;

    surveyModal.classList.add("hidden");
    completeModal.classList.remove("hidden");
});

// 10. Download Backup JSON
downloadBackupBtn.addEventListener("click", () => {
    if (!lastSubmissionPayload) return;
    const blob = new Blob([JSON.stringify(lastSubmissionPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `study_no_ai_${participantId.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

// 11. Lightbox Helpers for Zooming Images
function openLightbox(src, caption) {
    document.getElementById("lightbox-img").src = src;
    document.getElementById("lightbox-caption").textContent = caption || "";
    document.getElementById("lightbox-modal").classList.remove("hidden");
}

function openCurrentImageLightbox() {
    const trial = trials[currentIndex];
    if (!trial) return;
    openLightbox(currentTrialImage.src, `Trial ${currentIndex + 1} Medical Image`);
}

function closeLightbox() {
    document.getElementById("lightbox-modal").classList.add("hidden");
}
