// CSVデータを格納
let cardsData = [];
let originalCardsData = []; // 元のデータを保持
let isConfirmed = false;
let confirmedOrder = [];
let hasOrderJson = false; // order.jsonが存在するかどうか
let showSchedule = false; // スケジュール表示モードかどうか
let justConfirmed = false; // 確定直後かどうか

// クラス名のマッピング
const classMap = {
    '高尾クラス': 'takawo',
    '八尾クラス': 'yao',
    '山下クラス': 'yamashita'
};

// 確定状態を読み込む（JSONファイルから）
async function loadConfirmedState() {
    try {
        // まずorder.jsonを自動で読み込もうとする
        try {
            const response = await fetch('order.json');
            if (response.ok) {
                const data = await response.json();
                isConfirmed = data.isConfirmed || false;
                confirmedOrder = data.order || [];
                hasOrderJson = true;
                return true;
            }
        } catch (fetchError) {
            // order.jsonが存在しない場合は無視
            console.log('order.jsonが見つかりません。CSVの順序で表示します。');
            hasOrderJson = false;
        }
    } catch (error) {
        console.error('確定状態の読み込みエラー:', error);
        hasOrderJson = false;
    }
    return false;
}

// 確定状態をJSONファイルとして保存（ダウンロード）
function saveConfirmedState() {
    try {
        const data = {
            isConfirmed: isConfirmed,
            order: confirmedOrder,
            timestamp: new Date().toISOString()
        };

        // JSONファイルとしてダウンロード
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'order.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('order.jsonファイルをダウンロードしました。');
    } catch (error) {
        console.error('確定状態の保存エラー:', error);
        alert('JSONファイルの保存に失敗しました。');
    }
}

// JSONファイルを読み込む（ファイル選択から）
function loadJSONFromFile(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            isConfirmed = data.isConfirmed || false;
            confirmedOrder = data.order || [];

            // データを再読み込みして順序を復元
            if (isConfirmed && confirmedOrder.length > 0 && originalCardsData.length > 0) {
                // カードデータを再構築
                const orderedCards = [];
                confirmedOrder.forEach(originalIndex => {
                    const card = originalCardsData.find(c => c.originalIndex === originalIndex);
                    if (card) {
                        orderedCards.push(card);
                    }
                });
                // 見つからないカードがあれば、残りを追加
                originalCardsData.forEach(card => {
                    if (!orderedCards.find(c => c.originalIndex === card.originalIndex)) {
                        orderedCards.push(card);
                    }
                });
                cardsData = orderedCards;
                showSchedule = true;
                hasOrderJson = true;

                renderCards();
                updateUI();
                alert('JSONファイルから確定状態を読み込みました。');
            } else if (!isConfirmed) {
                // 未確定の状態として扱う
                cardsData = shuffleArray([...originalCardsData]);
                showSchedule = false;
                renderCards();
                updateUI();
                alert('JSONファイルを読み込みました（未確定状態）。');
            } else {
                alert('JSONファイルの形式が正しくないか、データが読み込まれていません。');
            }
        } catch (error) {
            console.error('JSONファイルの解析エラー:', error);
            alert('JSONファイルの読み込みに失敗しました。');
        }
    };
    reader.readAsText(file);
}

// 配列をシャッフル（Fisher-Yatesアルゴリズム）
function shuffleArraySimple(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ブロック方式でシャッフル（3グループx3回のブロック）
function shuffleArray(array) {
    // クラスごとにグループを分類
    const takawoGroups = array.filter(card => card.class === '高尾クラス');
    const yaoGroups = array.filter(card => card.class === '八尾クラス');
    const yamashitaGroups = array.filter(card => card.class === '山下クラス');

    // 高尾クラスの3グループをシャッフルして、イ、ロ、ハに割り当て
    const shuffledTakawo = shuffleArraySimple(takawoGroups);

    // 八尾クラスと山下クラスもシャッフル
    const shuffledYao = shuffleArraySimple(yaoGroups);
    const shuffledYamashita = shuffleArraySimple(yamashitaGroups);

    // イ、ロ、ハの3つのブロックを作成
    const blocks = [
        [shuffledTakawo[0], shuffledYao[0], shuffledYamashita[0]], // イブロック
        [shuffledTakawo[1], shuffledYao[1], shuffledYamashita[1]], // ロブロック
        [shuffledTakawo[2], shuffledYao[2], shuffledYamashita[2]]  // ハブロック
    ];

    // 各ブロック内の順序をシャッフル
    blocks.forEach(block => {
        const shuffled = shuffleArraySimple(block);
        block.length = 0;
        block.push(...shuffled);
    });

    // ブロックの順序をシャッフル（イ、ロ、ハの順序）
    const shuffledBlocks = shuffleArraySimple(blocks);

    // ブロックを展開して最終的な配列を作成
    const result = [];
    shuffledBlocks.forEach(block => {
        result.push(...block);
    });

    return result;
}

// CSVファイルを読み込む
async function loadCSV() {
    try {
        const response = await fetch('data.csv');
        if (!response.ok) {
            throw new Error(`data.csvファイルが見つかりません (ステータス: ${response.status})`);
        }
        const text = await response.text();
        if (!text || text.trim().length === 0) {
            throw new Error('data.csvファイルが空です');
        }
        const lines = text.trim().split('\n');

        // ヘッダーを取得
        const headers = lines[0].split(',');

        // データをパース
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            // CSVのパース（カンマ区切り、引用符内のカンマを考慮）
            const values = parseCSVLine(line);

            if (values.length >= 4) {
                const card = {
                    class: values[0],
                    group: values[1],
                    theme: values[2],
                    materialsUrl: values[3],
                    order: i
                };
                cardsData.push(card);
            }
        }

        // 元のデータを保持
        originalCardsData = [...cardsData];

        // まず全てのカードにoriginalIndexを設定
        cardsData.forEach((card, index) => {
            card.originalIndex = index;
        });
        originalCardsData.forEach((card, index) => {
            card.originalIndex = index;
        });

        // 確定状態を読み込む（JSONファイルから）
        const hasConfirmedState = await loadConfirmedState();

        if (!hasOrderJson) {
            // order.jsonがない場合はCSVの順序のまま（シャッフルしない）
            // cardsDataは既にCSVの順序なのでそのまま使用
            // ただし、確定ボタンを押したときにシャッフルする
        } else if (hasConfirmedState && isConfirmed && confirmedOrder.length === cardsData.length) {
            // 確定済みの場合は保存された順序を復元
            const orderedCards = [];
            confirmedOrder.forEach(originalIndex => {
                const card = originalCardsData.find(c => c.originalIndex === originalIndex);
                if (card) {
                    orderedCards.push(card);
                }
            });
            // 見つからないカードがあれば、残りを追加
            originalCardsData.forEach(card => {
                if (!orderedCards.find(c => c.originalIndex === card.originalIndex)) {
                    orderedCards.push(card);
                }
            });
            cardsData = orderedCards;
            // 確定済みの場合はスケジュール表示にする
            showSchedule = true;
        } else {
            // 未確定の場合はランダムにシャッフル
            // order.jsonがある場合でも、未確定ならシャッフル
            cardsData = shuffleArray([...originalCardsData]);
        }

        // データが読み込まれなかった場合
        if (cardsData.length === 0) {
            throw new Error('CSVファイルにデータが含まれていません');
        }

        renderCards();
        updateUI();
    } catch (error) {
        console.error('CSV読み込みエラー:', error);
        const container = document.getElementById('cards-container');
        if (container) {
            container.innerHTML =
                '<div style="text-align: center; color: red; padding: 2rem;">' +
                '<p style="font-size: 1.2rem; font-weight: bold; margin-bottom: 1rem;">データの読み込みに失敗しました</p>' +
                '<p style="margin-bottom: 0.5rem;">エラー: ' + error.message + '</p>' +
                '<p style="font-size: 0.9rem; color: #666;">data.csvファイルが存在することを確認してください。</p>' +
                '</div>';
        }
    }
}

// CSV行をパース（引用符内のカンマを考慮）
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    if (current.trim()) {
        values.push(current.trim());
    }

    return values;
}

// スケジュール表示をレンダリング
function renderSchedule() {
    const container = document.getElementById('cards-container');
    if (!container) return;

    container.innerHTML = '';
    container.classList.add('schedule-view');

    // カードが存在しない場合はエラー
    if (!cardsData || cardsData.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: red; padding: 2rem;">データが読み込まれていません。</p>';
        return;
    }

    // 確定済みの場合は、confirmedOrderに基づいて順序を再構築
    // 確定直後の場合はcardsDataをそのまま使用、ページ再読み込み後の場合は再構築
    let displayCards = cardsData;
    if (isConfirmed && confirmedOrder.length === cardsData.length && !justConfirmed) {
        // 確定直後でない場合は、confirmedOrderに基づいて再構築（ページ再読み込み後の場合）
        const orderedCards = [];
        confirmedOrder.forEach(originalIndex => {
            const card = originalCardsData.find(c => c.originalIndex === originalIndex);
            if (card) {
                orderedCards.push(card);
            }
        });
        // 見つからないカードがあれば、残りを追加
        originalCardsData.forEach(card => {
            if (!orderedCards.find(c => c.originalIndex === card.originalIndex)) {
                orderedCards.push(card);
            }
        });
        displayCards = orderedCards;
        // cardsDataも更新して次回以降も正しい順序を保持
        cardsData = orderedCards;
    }
    // 確定直後の場合は、cardsDataをそのまま使用（既にシャッフルされた順序になっている）

    // 12/10のセクション（最初の4グループ）
    const section1 = document.createElement('div');
    section1.className = 'schedule-section';

    const section1Header = document.createElement('div');
    section1Header.className = 'schedule-section-header';
    section1Header.innerHTML = '<h2>12月10日（4グループ発表）</h2>';
    section1.appendChild(section1Header);

    const section1Content = document.createElement('div');
    section1Content.className = 'schedule-section-content';

    for (let i = 0; i < 4 && i < displayCards.length; i++) {
        const scheduleItem = createScheduleItem(displayCards[i], i + 1);
        section1Content.appendChild(scheduleItem);
    }
    section1.appendChild(section1Content);
    container.appendChild(section1);

    // 12/17のセクション（残りの5グループ）
    if (displayCards.length > 4) {
        const section2 = document.createElement('div');
        section2.className = 'schedule-section';

        const section2Header = document.createElement('div');
        section2Header.className = 'schedule-section-header';
        section2Header.innerHTML = '<h2>12月17日（5グループ発表）</h2>';
        section2.appendChild(section2Header);

        const section2Content = document.createElement('div');
        section2Content.className = 'schedule-section-content';

        for (let i = 4; i < displayCards.length; i++) {
            const scheduleItem = createScheduleItem(displayCards[i], i + 1);
            section2Content.appendChild(scheduleItem);
        }
        section2.appendChild(section2Content);
        container.appendChild(section2);
    }
}

// スケジュール項目を作成
function createScheduleItem(card, order) {
    const item = document.createElement('div');
    item.className = `schedule-item ${classMap[card.class] || ''}`;

    // クリックイベント
    item.addEventListener('click', () => {
        window.open(card.materialsUrl, '_blank');
    });

    const orderDiv = document.createElement('div');
    orderDiv.className = 'schedule-order';
    orderDiv.textContent = order;
    item.appendChild(orderDiv);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'schedule-content';

    const classGroupDiv = document.createElement('div');
    classGroupDiv.className = 'schedule-class-group';

    const classLabel = document.createElement('span');
    classLabel.className = 'class-label';
    classLabel.textContent = card.class;
    classGroupDiv.appendChild(classLabel);

    const groupLabel = document.createElement('span');
    groupLabel.className = 'group-label';
    groupLabel.textContent = card.group;
    classGroupDiv.appendChild(groupLabel);

    contentDiv.appendChild(classGroupDiv);

    const themeDiv = document.createElement('div');
    themeDiv.className = 'schedule-theme';
    themeDiv.textContent = card.theme;
    contentDiv.appendChild(themeDiv);

    item.appendChild(contentDiv);
    return item;
}

// カードをレンダリング
function renderCards() {
    // スケジュール表示モードの場合はスケジュールを表示
    if (showSchedule && isConfirmed) {
        renderSchedule();
        return;
    }

    const container = document.getElementById('cards-container');
    if (!container) return;

    container.innerHTML = '';
    container.classList.remove('schedule-view');

    // 確定前はアニメーション用のクラスを追加
    if (!isConfirmed) {
        container.classList.add('shuffling');
    } else {
        container.classList.remove('shuffling', 'confirming');
    }

    // カードが存在しない場合はエラー
    if (!cardsData || cardsData.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: red; padding: 2rem;">データが読み込まれていません。</p>';
        return;
    }

    // order.jsonがある場合のみ区切りを表示
    if (hasOrderJson) {
        // 最初に12/10のセクションヘッダーを追加
        const firstDivider = createSectionDivider('12月10日（4グループ発表）');
        container.appendChild(firstDivider);
    }

    cardsData.forEach((card, index) => {
        // order.jsonがある場合のみ、4グループ目と5グループ目の間に区切りを追加
        if (hasOrderJson && index === 4) {
            const divider = createSectionDivider('12月17日（5グループ発表）');
            container.appendChild(divider);
        }

        const cardElement = createCardElement(card, index, isConfirmed);
        if (!isConfirmed) {
            cardElement.classList.add('shuffled');
            // ランダムな遅延でアニメーション
            cardElement.style.animationDelay = `${index * 0.1}s`;
        } else {
            // 確定済みの場合は即座に表示
            cardElement.style.opacity = '1';
            cardElement.style.transform = 'none';
        }
        container.appendChild(cardElement);
    });
}

// セクション区切りを作成
function createSectionDivider(text) {
    const dividerDiv = document.createElement('div');
    dividerDiv.className = 'section-divider';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'section-header';
    headerDiv.textContent = text;

    dividerDiv.appendChild(headerDiv);
    return dividerDiv;
}

// カード要素を作成
function createCardElement(card, index, showOrder = true) {
    const cardDiv = document.createElement('div');
    cardDiv.className = `card ${classMap[card.class] || ''}`;
    cardDiv.setAttribute('data-order', card.order);

    // クリックイベント
    cardDiv.addEventListener('click', () => {
        window.open(card.materialsUrl, '_blank');
    });

    // 発表順（表示用の順番はindex + 1）
    // 確定していない場合は非表示
    if (showOrder) {
        const orderDiv = document.createElement('div');
        orderDiv.className = 'card-order';
        orderDiv.textContent = index + 1;
        cardDiv.appendChild(orderDiv);
    } else {
        // 番号がない場合はクラスを追加してレイアウトを調整
        cardDiv.classList.add('no-order');
    }

    // メインコンテンツ（クラス・グループ、発表タイトル、発表者）
    const contentDiv = document.createElement('div');
    contentDiv.className = 'card-content';

    // クラス・グループ
    const classGroupDiv = document.createElement('div');
    classGroupDiv.className = 'card-class-group';

    // クラスラベル
    const classLabel = document.createElement('span');
    classLabel.className = 'class-label';
    classLabel.textContent = card.class;
    classGroupDiv.appendChild(classLabel);

    // グループラベル
    const groupLabel = document.createElement('span');
    groupLabel.className = 'group-label';
    groupLabel.textContent = card.group;
    classGroupDiv.appendChild(groupLabel);

    contentDiv.appendChild(classGroupDiv);

    // 発表タイトル
    const themeDiv = document.createElement('div');
    themeDiv.className = 'card-theme';
    themeDiv.textContent = card.theme;
    contentDiv.appendChild(themeDiv);

    cardDiv.appendChild(contentDiv);

    return cardDiv;
}

// UIを更新
function updateUI() {
    const confirmBtn = document.getElementById('confirm-btn');
    const statusMessage = document.getElementById('status-message');
    const controlsRow = document.querySelector('.controls-row');

    // order.jsonがない場合
    if (!hasOrderJson) {
        if (confirmBtn) {
            confirmBtn.style.display = '';
            confirmBtn.textContent = '発表順を確定';
            confirmBtn.disabled = false;
            confirmBtn.classList.remove('confirmed');
        }
        if (statusMessage) {
            statusMessage.textContent = '※ CSVの順序で表示中（order.jsonがありません）';
            statusMessage.classList.remove('confirmed');
        }
        return;
    }

    // order.jsonがある場合は通常通り表示
    if (confirmBtn) confirmBtn.style.display = '';

    if (isConfirmed) {
        confirmBtn.textContent = '発表順確定済み';
        confirmBtn.disabled = true;
        confirmBtn.classList.add('confirmed');
        statusMessage.textContent = '✓ 発表順が確定されています';
        statusMessage.classList.add('confirmed');
    } else {
        confirmBtn.textContent = '発表順を確定';
        confirmBtn.disabled = false;
        confirmBtn.classList.remove('confirmed');
        statusMessage.textContent = '※ 発表順を確定してください';
        statusMessage.classList.remove('confirmed');
    }
}

// 発表順を確定
function confirmOrder() {
    if (isConfirmed) return;

    // 確定時に必ずシャッフル（order.jsonがない場合、または未確定の場合）
    // 現在のcardsDataの順序がCSVの順序（0,1,2,3...）の場合はシャッフル
    const currentOrder = cardsData.map(card => card.originalIndex);
    const isOriginalOrder = currentOrder.length === originalCardsData.length &&
        currentOrder.every((val, idx) => val === idx);

    if (isOriginalOrder || !hasOrderJson) {
        // CSVの順序のままの場合は、確定時にシャッフル
        cardsData = shuffleArray([...originalCardsData]);
        // シャッフル後のcardsDataを再描画（アニメーションなしで即座に）
        const container = document.getElementById('cards-container');
        container.innerHTML = '';
        cardsData.forEach((card, index) => {
            const cardElement = createCardElement(card, index);
            cardElement.style.opacity = '1';
            cardElement.style.transform = 'none';
            container.appendChild(cardElement);
        });
    }

    // 確定演出
    const container = document.getElementById('cards-container');
    container.classList.add('confirming');

    // 現在の順序を保存（originalIndexを保存）
    // この時点でのcardsDataの順序を保持（シャッフルされた順序）
    confirmedOrder = cardsData.map(card => card.originalIndex);

    // デバッグ用：確認
    console.log('確定時の順序:', confirmedOrder);
    console.log('cardsDataの順序:', cardsData.map(c => c.originalIndex));

    isConfirmed = true;
    justConfirmed = true; // 確定直後フラグを設定
    hasOrderJson = true; // 確定したので、order.jsonがある状態にする

    // cardsDataの順序を確定済みの順序として保持
    // cardsDataは既にシャッフルされた順序なので、そのまま使用
    // スケジュール表示時にこの順序を使用するため、cardsDataを保持

    saveConfirmedState();

    // アニメーション後に確定状態を反映し、スケジュール表示に切り替え
    setTimeout(() => {
        container.classList.remove('confirming', 'shuffling');
        const cards = container.querySelectorAll('.card');
        cards.forEach(card => {
            card.classList.remove('shuffled');
            card.style.opacity = '1';
            card.style.transform = 'none';
        });
        showSchedule = true;
        // cardsDataは既に確定された順序なので、そのままスケジュール表示
        renderSchedule();
        updateUI();
        // 確定直後フラグをリセット（次回のrenderSchedule呼び出し時は再構築が必要な場合があるため）
        setTimeout(() => {
            justConfirmed = false;
        }, 100);
    }, 800);
}

// ページ読み込み時にCSVを読み込む
document.addEventListener('DOMContentLoaded', () => {
    loadCSV();

    // 確定ボタンのイベント
    const confirmBtn = document.getElementById('confirm-btn');
    confirmBtn.addEventListener('click', confirmOrder);

    // JSONファイル読み込みのイベント
    const loadJsonInput = document.getElementById('load-json-input');
    loadJsonInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            loadJSONFromFile(file);
        }
        // 同じファイルを再度選択できるようにリセット
        e.target.value = '';
    });
});

// ウィンドウリサイズ時の処理（CSSで対応）
window.addEventListener('resize', () => {
    // レスポンシブデザインはCSSで対応
});

