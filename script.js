// === 遊戲設定 ===
const TARGET_SCORE = 150;  // 目標分數
const POINTS_CORRECT = 10;  // 答對得分
const POINTS_WRONG = 10;    // 答錯扣分

// === 狀態管理 ===
let state = {
    score: 0,               // 當前分數
    correctCount: 0,        // 正確題數
    wrongCount: 0,          // 錯誤題數
    currProblem: null,       // 當前題目
    canShowAnswer: false  // 是否允許顯示答案
};

// === 重置按鈕的狀態計數器 ===
let resetClickCount = 0;   // 重置按鈕點擊次數
let resetTimeout = null;   // 重置按鈕計時器

// === 標題點擊計數器 ===
let titleClickCount = 0;

// === DOM 元素引用 ===
const titleElement = document.querySelector('h1');
const answerBtn = document.getElementById('showAnswerBtn');


// === Canvas 設定 ===
const canvas = document.getElementById('gameCanvas');  // 遊戲畫布元素
const ctx = canvas.getContext('2d');  // 畫布繪圖上下文

// === 字體設定 ===
let fontLabel = "bold 16px 'Comic Sans MS', sans-serif";  // 標籤字體
let fontValue = "bold 24px 'Comic Sans MS', sans-serif";  // 數值字體
let fontFactor = "bold 20px 'Comic Sans MS', sans-serif"; // 比例字體

/**
 * 設定Canvas以適應高DPI顯示器
 * 調整畫布像素與CSS顯示尺寸，解決模糊問題
 */
function setupCanvas() {
    // 取得設備像素比
    const dpr = window.devicePixelRatio || 1;

    // 保存原始畫布尺寸
    const rect = canvas.getBoundingClientRect();

    // 設定畫布實際像素尺寸（考慮設備像素比）
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // 調整繪圖上下文縮放比例
    ctx.scale(dpr, dpr);

    // 設定CSS顯示尺寸（保持原有布局）
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
}

// === 初始化 ===
/**
 * 初始化遊戲
 * 設定Canvas、加載狀態、註冊事件監聽器
 */
function init() {
    // 先設置Canvas以適應高DPI
    setupCanvas();
    // 監聽窗口大小變化，重新調整Canvas
    window.addEventListener('resize', () => {
        setupCanvas();
        if (state.currProblem) {
            drawProblem(state.currProblem);
        }
    });

    loadState();  // 加載保存的狀態
    updateUI();   // 更新界面顯示

    // 初始化輸入框占位符
    updateInputPlaceholder();

    // 語言切換功能
    document.getElementById('btn-lang').addEventListener('click', function () {
        const isEnglish = document.body.classList.contains('english');
        const langBtn = document.getElementById('btn-lang');
        const body = document.body;

        // 切換語言類別
        body.classList.toggle('english');

        // 更新標籤欄標題
        if (body.classList.contains('english')) {
            document.title = document.querySelector('meta[name="title-en"]').content;
        } else {
            document.title = document.querySelector('meta[name="title-zh"]').content;
        }

        if (isEnglish) {
            // 切換到中文
            document.body.classList.remove('english');
            langBtn.classList.remove('active');
        } else {
            // 切換到英文
            document.body.classList.add('english');
            langBtn.classList.add('active');
        }

        updateInputPlaceholder();

        // 更新提示文本語言
        const fb = document.getElementById('feedbackArea');
        if (fb.innerHTML) {
            fb.innerHTML = fb.innerHTML
                .replace('提交', 'Submit')
                .replace('答案', 'Answer')
                .replace('正確', 'Correct')
                .replace('錯誤', 'Wrong')
                .replace('目標完成', 'Mission Complete')
                .replace('Please enter a number', '請輸入數字')
                .replace('Click again to confirm reset', '再次點擊確認重置')
                .replace('Progress reset!', '已重置進度!');
        }
    });

    // 初始化時設置正確的active狀態
    window.addEventListener('load', function () {
        const langBtn = document.getElementById('btn-lang');
        if (document.body.classList.contains('english')) {
            langBtn.classList.add('active');
        }
    });

    // 標題點擊事件處理

    titleElement.addEventListener('click', () => {
        titleClickCount++;
        const isBtnVisible = answerBtn.style.display !== 'none';

        // 按鈕隱藏時，點擊5次顯示
        if (!isBtnVisible && titleClickCount >= 5) {
            answerBtn.style.display = 'flex';
            titleClickCount = 0;
        }
        // 按鈕顯示時，點擊5次隱藏
        else if (isBtnVisible && titleClickCount >= 5) {
            answerBtn.style.display = 'none';
            titleClickCount = 0;
        }
    });
    setupInputHandling(); // 設置輸入處理
}

/**
 * 處理輸入框焦點和鍵盤事件
 */
function setupInputHandling() {
    const input = document.getElementById('userAnswer');
    input.addEventListener('focus', () => {
        // 在移動設備上，輸入框獲得焦點時滾動到可見位置
        if (window.innerWidth <= 768) {
            setTimeout(() => {
                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300); // 延遲確保鍵盤已彈出
        }
    });

    // 支持回車鍵提交答案
    input.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            checkAnswer();
        }
    });
}

/**
 * 更新輸入框占位符
 */
function updateInputPlaceholder() {
    const input = document.getElementById('userAnswer');
    if (document.body.classList.contains('english')) {
        input.placeholder = input.getAttribute('data-placeholder-en');
    } else {
        input.placeholder = input.getAttribute('data-placeholder-zh');
    }
}

/**
 * 從本地存儲加載遊戲狀態
 * 如果有保存的狀態則恢復，否則生成新題目
 */
function loadState() {
    const data = localStorage.getItem('percentGameData_v3');
    if (data) {
        state = JSON.parse(data);
        if (!state.currProblem) generateQuestion();
        else drawProblem(state.currProblem);
    } else {
        generateQuestion();
    }
}

/**
 * 保存當前遊戲狀態到本地存儲
 * 並更新界面顯示
 */
function saveState() {
    localStorage.setItem('percentGameData_v3', JSON.stringify(state));
    updateUI();
}

/**
 * 更新界面顯示
 * 包括分數、正確題數和進度條
 */
function updateUI() {
    document.getElementById('scoreVal').innerText = state.score;
    document.getElementById('correctVal').innerText = state.correctCount;

    // 計算並更新進度條
    let progress = (state.score / TARGET_SCORE) * 100;
    if (progress < 0) progress = 0;
    if (progress > 100) progress = 100;
    document.getElementById('progressBar').style.width = progress + "%";

    // 達成目標時顯示慶祝信息
    if (state.score >= TARGET_SCORE && !state.hasCelebrated) {
        document.getElementById('feedbackArea').innerHTML = document.body.classList.contains('english') ?
            "🎉 Mission Complete! 150 Points!" : "🎉 目標完成! 150分!";
        state.hasCelebrated = true;
    }
}

// === 題目生成邏輯 ===
/**
 * 生成新題目
 * 隨機生成三種類型的題目：求新值、求原值、求百分比變化
 */
function generateQuestion() {
    const type = Math.floor(Math.random() * 3); // 0: 求新值, 1: 求原值, 2: 求百分比

    // 數值生成
    let oldVal = (Math.floor(Math.random() * 10) + 2) * 10; // 原值：20, 30 ... 110
    let percent = (Math.floor(Math.random() * 5) + 1) * 10; // 百分比：10, 20 ... 50
    let isIncrease = Math.random() > 0.5; // 是否為增加（true）或減少（false）

    // 計算比例和新值
    let factor = isIncrease ? (1 + percent / 100) : (1 - percent / 100);
    let newVal = Math.round(oldVal * factor);

    // 題目物件
    let problem = {
        old: oldVal,       // 原值
        new: newVal,       // 新值
        percent: percent,  // 百分比
        isIncrease: isIncrease, // 是否增加
        type: type,        // 題型
        answer: 0          // 正確答案
    };

    // 構建中間方格的文字內容: ( 1 + 20% ) 或 ( 1 - 20% )
    // 用於求原值/求新值題型的顯示
    let sign = isIncrease ? "+" : "-";
    let factorText = `( 1 ${sign} ${percent}% )`;

    if (type === 0) {
        // 求新值
        problem.answer = newVal;
        problem.display = {
            old: oldVal,
            mid: factorText,
            new: "?",
            mode: "findNew"
        };
    } else if (type === 1) {
        // 求原值
        problem.answer = oldVal;
        problem.display = {
            old: "?",
            mid: factorText,
            new: newVal,
            mode: "findOld"
        };
    } else {
        // 求百分比變化
        problem.answer = isIncrease ? percent : -percent;

        // 強制使用 ( 1 + ? % ) 格式
        // 即使是減少，也顯示 +，迫使學生輸入負數答案
        problem.display = {
            old: oldVal,
            mid: `( 1 + ? % )`,
            new: newVal,
            mode: "findPercent"
        };
    }

    // 更新狀態並保存
    state.currProblem = problem;
    state.hasCelebrated = (state.score >= TARGET_SCORE);
    saveState();

    // 重置輸入區和反饋區
    document.getElementById('userAnswer').value = "";
    document.getElementById('feedbackArea').innerText = "";
    document.getElementById('feedbackArea').className = "feedback";
    document.getElementById('userAnswer').focus();

    // 繪製題目
    drawProblem(problem);
}

// === Canvas 繪圖 (三格布局) ===
/**
 * 在Canvas上繪製題目
 * @param {Object} p - 題目物件
 */
function drawProblem(p) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 強制白色背景
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 取得調整後的畫布尺寸（考慮縮放）
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    const centerY = displayHeight / 2 + 15; // 微調垂直位置

    // 【行動端適配】根據螢幕寬度動態調整布局參數
    let boxW, midBoxW, arrowLen, spacing;

    // 三級螢幕寬度適配
    if (displayWidth <= 375) { // 超小屏（如iPhone SE）
        boxW = 60;
        midBoxW = 90;
        arrowLen = 20;
        spacing = 5;
        // 調整字體大小
        fontLabel = "bold 14px 'Comic Sans MS', sans-serif";
        fontValue = "bold 20px 'Comic Sans MS', sans-serif";
        fontFactor = "bold 16px 'Comic Sans MS', sans-serif";
    } else if (displayWidth <= 768) { // 小屏設備
        boxW = 70;         // 縮小左右方格寬度
        midBoxW = 110;     // 縮小中間方格寬度
        arrowLen = 30;     // 縮短箭頭長度
        spacing = 10;      // 減小間距
        // 調整字體大小
        fontLabel = "bold 14px 'system-ui', sans-serif";
        fontValue = "bold 20px 'system-ui', sans-serif";
        fontFactor = "bold 16px 'system-ui', sans-serif";
    } else { // 大屏幕設備
        boxW = 100;
        midBoxW = 140;
        arrowLen = 50;
        spacing = 15;
        // 恢復默認字體
        fontLabel = "bold 16px 'system-ui', sans-serif";
        fontValue = "bold 24px 'system-ui', sans-serif";
        fontFactor = "bold 20px 'system-ui', sans-serif";
    }

    const boxH = 60;         // 方格高度保持不變

    // 計算位置: [原值] --箭頭-- [比例] --箭頭-- [新值]
    const centerX = displayWidth / 2;
    const midX = centerX;
    const oldX = centerX - midBoxW / 2 - arrowLen - boxW / 2 - 15;
    const newX = centerX + midBoxW / 2 + arrowLen + boxW / 2 + 15;

    // 1. 繪製原值方格
    drawBox(oldX, centerY, boxW, boxH, "Old", p.display.old);

    // 2. 繪製新值方格
    drawBox(newX, centerY, boxW, boxH, "New", p.display.new);

    // 3. 繪製中間方格（百分比變化）
    drawMidBox(midX, centerY, midBoxW, boxH, "% Change", p.display.mid);

    // 4. 繪製箭頭
    drawArrow(oldX + boxW / 2 + 5, centerY, midX - midBoxW / 2 - 5, centerY);
    drawArrow(midX + midBoxW / 2 + 5, centerY, newX - boxW / 2 - 5, centerY);
}

/**
 * 繪製左右方格（原值/新值）
 * @param {number} x - 中心X座標
 * @param {number} y - 中心Y座標
 * @param {number} w - 寬度
 * @param {number} h - 高度
 * @param {string} label - 標籤文字
 * @param {string|number} value - 顯示數值
 */
function drawBox(x, y, w, h, label, value) {
    const left = x - w / 2;
    const top = y - h / 2;
    const radius = 10; // 圓角半徑

    // 繪製方格
    ctx.beginPath();
    ctx.roundRect(left, top, w, h, radius);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000";
    ctx.stroke();

    // 繪製標籤（Old/New）
    ctx.font = fontLabel;
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(label, x, top - 8);

    // 繪製數值
    ctx.font = fontValue;
    ctx.fillStyle = (value === "?") ? "#e67e22" : "#000"; // 問號用橙色
    ctx.textBaseline = "middle";
    ctx.fillText(value, x, y);
}

/**
 * 繪製中間方格（百分比變化）
 * @param {number} x - 中心X座標
 * @param {number} y - 中心Y座標
 * @param {number} w - 寬度
 * @param {number} h - 高度
 * @param {string} label - 標籤文字
 * @param {string} value - 顯示內容
 */
function drawMidBox(x, y, w, h, label, value) {
    const left = x - w / 2;
    const top = y - h / 2;
    const radius = 10; // 圓角半徑

    // 繪製方格（淺藍色背景）
    ctx.beginPath();
    ctx.roundRect(left, top, w, h, radius);
    ctx.fillStyle = "#e3f2fd";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000";
    ctx.stroke();

    // 繪製標籤（% Change）
    ctx.font = fontLabel;
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(label, x, top - 8);

    // 繪製比例文字
    ctx.font = fontFactor;
    ctx.fillStyle = (value.includes("?")) ? "#e67e22" : "#000"; // 問號用橙色
    ctx.textBaseline = "middle";
    ctx.fillText(value, x, y);
}

/**
 * 繪製箭頭
 * @param {number} x1 - 起始點X座標
 * @param {number} y1 - 起始點Y座標
 * @param {number} x2 - 結束點X座標
 * @param {number} y2 - 結束點Y座標
 */
function drawArrow(x1, y1, x2, y2) {
    const headLength = 10; // 箭頭長度
    const angle = Math.atan2(y2 - y1, x2 - x1); // 計算角度

    // 繪製線段
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 繪製箭頭
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
        x2 - headLength * Math.cos(angle - Math.PI / 6),
        y2 - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        x2 - headLength * Math.cos(angle + Math.PI / 6),
        y2 - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = "#000";
    ctx.fill();
}

/**
 * 檢查用戶答案是否正確
 */
function checkAnswer() {
    const userInput = document.getElementById('userAnswer');
    const userAnswer = parseFloat(userInput.value);
    const feedback = document.getElementById('feedbackArea');

    // 檢查輸入是否有效
    if (isNaN(userAnswer)) {
        feedback.textContent = document.body.classList.contains('english') ? "Please enter a number" : "請輸入數字";
        feedback.className = "feedback wrong";
        return;
    }

    // 檢查答案是否正確（容許微小浮點誤差）
    const isCorrect = Math.abs(userAnswer - state.currProblem.answer) < 0.01;

    // 更新分數和統計
    if (isCorrect) {
        state.score += POINTS_CORRECT;
        state.correctCount++;
        feedback.textContent = document.body.classList.contains('english') ? "Correct! +10 points" : "正確! +10分";
        feedback.className = "feedback correct";
    } else {
        state.score -= POINTS_WRONG;
        state.wrongCount++;
        feedback.textContent = document.body.classList.contains('english') ?
            `Wrong! Correct answer: ${state.currProblem.answer}` :
            `錯誤! 正確答案: ${state.currProblem.answer}`;
        feedback.className = "feedback wrong";
    }

    // 保存狀態並生成新題目（短延遲讓用戶看到反饋）
    saveState();
    setTimeout(generateQuestion, 1000);
}

window.enableShowAnswer = function () {
    state.canShowAnswer = true;

    // 显示按钮
    const answerButton = document.getElementById('showAnswerBtn');
    if (answerButton) {
        answerButton.style.display = 'block';
    }

    // 输出多语言日志
    const isEnglish = document.body.classList.contains('english');
    console.log(isEnglish
        ? "Answer display enabled. The 'Show Answer' button is now visible."
        : "已開啟答案顯示功能，'顯示答案'按鈕已出現。");
};

// --- 新增：关闭答案显示功能 ---
window.disableShowAnswer = function () {
    state.canShowAnswer = false;

    // 隐藏按钮
    const answerButton = document.getElementById('showAnswerBtn');
    if (answerButton) {
        answerButton.style.display = 'none';
    }

    // 清空可能存在的答案反馈
    const feedback = document.getElementById('feedbackArea');
    if (feedback) {
        feedback.innerHTML = '';
        feedback.className = 'feedback'; // 重置样式
    }

    // 输出多语言日志
    const isEnglish = document.body.classList.contains('english');
    console.log(isEnglish
        ? "Answer display disabled. The 'Show Answer' button is now hidden."
        : "已禁用答案顯示功能，'顯示答案'按鈕已隱藏。");
};


/**
 * 顯示正確答案
 */
function showAnswer() {
    const feedback = document.getElementById('feedbackArea');
    // 修改为统一的语言检测方式
    feedback.textContent = document.body.classList.contains('english') ?
        `Answer: ${state.currProblem.answer}` :
        `答案: ${state.currProblem.answer}`;
    feedback.className = "feedback";

    // 有權限則顯示答案
    if (state.currProblem) {
        feedback.innerHTML = `${document.body.classList.contains('english') ? 'Correct answer: ' : '正確答案是: '}${state.currProblem.answer}`;
        feedback.className = "feedback correct";
    }
}


/**
 * 顯示成績單
 */
function showReport() {
    const total = state.correctCount + state.wrongCount;
    const accuracy = total > 0 ? Math.round((state.correctCount / total) * 100) : 0;

    // 更新報告數據
    document.getElementById('repScore').textContent = state.score;
    document.getElementById('repTotal').textContent = total;
    document.getElementById('repCorrect').textContent = state.correctCount;
    document.getElementById('repAcc').textContent = `${accuracy}%`;

    // 顯示當前時間
    const now = new Date();
    document.getElementById('repTime').textContent = now.toLocaleString();

    // 顯示模態框
    document.getElementById('reportModal').style.display = 'flex';
}

/**
 * 關閉成績單
 */
function closeReport() {
    document.getElementById('reportModal').style.display = 'none';
}

/**
 * 處理重置按鈕（需要連續點擊兩次確認）
 */
function handleReset() {
    resetClickCount++;

    // 第一次點擊 - 顯示確認提示
    if (resetClickCount === 1) {
        const feedback = document.getElementById('feedbackArea');
        feedback.textContent = document.body.classList.contains('english') ?
            "Click again to confirm reset" : "再次點擊確認重置";
        feedback.className = "feedback wrong";

        // 設置計時器，超時重置計數
        resetTimeout = setTimeout(() => {
            resetClickCount = 0;
            feedback.textContent = "";
        }, 3000);
    }
    // 第二次點擊 - 執行重置
    else if (resetClickCount === 2) {
        clearTimeout(resetTimeout);
        localStorage.removeItem('percentGameData_v3');

        // 重置状态 - 新增hasCelebrated: false
        state = {
            score: 0,
            correctCount: 0,
            wrongCount: 0,
            currProblem: null,
            hasCelebrated: false  // 新增此行
        };

        // 更新界面
        const feedback = document.getElementById('feedbackArea');
        feedback.textContent = document.body.classList.contains('english') ?
            "Progress reset!" : "已重置進度!";
        feedback.className = "feedback correct";

        // 生成新題目
        setTimeout(generateQuestion, 1000);
        resetClickCount = 0;
    }
}

// 頁面加載完成後初始化遊戲
window.onload = init;