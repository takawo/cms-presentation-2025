// 配列をシャッフル（Fisher-Yatesアルゴリズム）
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
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

// URLがYouTubeかどうかを判定
function isYouTubeUrl(url) {
    if (!url || url.trim() === '') {
        return false;
    }
    return url.includes('youtube.com') || url.includes('youtu.be');
}

// URLが画像かどうかを判定
function isImageUrl(url) {
    if (!url || url.trim() === '') {
        return false;
    }
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const lowerUrl = url.toLowerCase();
    // 画像拡張子で終わる場合
    if (imageExtensions.some(ext => lowerUrl.endsWith(ext) || lowerUrl.includes(ext))) {
        return true;
    }
    // images/で始まる相対パスの場合
    if (lowerUrl.startsWith('images/')) {
        return true;
    }
    // imageやimgを含む場合
    if (lowerUrl.includes('image') || lowerUrl.includes('img')) {
        return true;
    }
    return false;
}

// YouTubeのURLを埋め込み用に変換
function convertToEmbedUrl(youtubeUrl) {
    if (!youtubeUrl || youtubeUrl.trim() === '') {
        return '';
    }

    // youtu.be/xxx 形式を変換
    if (youtubeUrl.includes('youtu.be/')) {
        const videoId = youtubeUrl.split('youtu.be/')[1].split('?')[0].split('&')[0];
        return `https://www.youtube.com/embed/${videoId}`;
    }

    // youtube.com/watch?v=xxx 形式を変換
    if (youtubeUrl.includes('youtube.com/watch?v=')) {
        const videoId = youtubeUrl.split('v=')[1].split('&')[0];
        return `https://www.youtube.com/embed/${videoId}`;
    }

    // 既に埋め込み形式の場合はそのまま
    if (youtubeUrl.includes('youtube.com/embed/')) {
        return youtubeUrl;
    }

    return youtubeUrl;
}

// 使用するURLを決定（PDFのURLを優先）
function getMaterialsUrl(card) {
    // PDFのURLが存在する場合はPDFを優先
    if (card.pdfUrl && card.pdfUrl.trim() !== '') {
        return card.pdfUrl;
    }
    // PDFのURLがない場合のみmaterials_urlを使用
    return card.materialsUrl || '';
}

// グループ名を正規化（1班→グループA、2班→グループB、3班→グループC）
function normalizeGroupName(group) {
    if (group === '1班') return 'グループA';
    if (group === '2班') return 'グループB';
    if (group === '3班') return 'グループC';
    return group;
}

// クラス名からCSSクラス名を取得
function getClassCssClass(className) {
    const classMap = {
        '高尾クラス': 'takawo',
        '八尾クラス': 'yao',
        '山下クラス': 'yamashita',
        '水野クラス': 'mizuno',
        '井口クラス': 'iguchi'
    };
    return classMap[className] || '';
}

// グループカードを作成
function createGroupCard(group) {
    const card = document.createElement('div');
    const classCssClass = getClassCssClass(group.class);
    card.className = `group-item class-${classCssClass}`;

    // 発表タイトルを最初に配置
    const theme = document.createElement('div');
    theme.className = 'group-theme';
    theme.textContent = group.theme || '発表タイトル未設定';
    card.appendChild(theme);

    // クラス名とグループ名をその下に配置
    const header = document.createElement('div');
    header.className = 'group-header';

    // クラス名ラベル
    const classLabel = document.createElement('span');
    classLabel.className = 'group-class-label';
    classLabel.textContent = group.class;
    header.appendChild(classLabel);

    // グループ名ラベル
    const groupLabel = document.createElement('span');
    groupLabel.className = 'group-label';
    groupLabel.textContent = normalizeGroupName(group.group);
    header.appendChild(groupLabel);

    card.appendChild(header);

    // プレゼンテーション表示
    const presentationUrl = group.presentationUrl || '';
    const placeholderUrl = 'https://placehold.jp/60/3d4070/ffffff/1280x720.png?text=%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%89%E3%81%BE%E3%81%9F%E3%81%AF%E7%99%BA%E8%A1%A8%E9%A2%A8%E6%99%AF';

    if (presentationUrl && presentationUrl.trim() !== '') {
        // YouTubeのURLの場合
        if (isYouTubeUrl(presentationUrl)) {
            const youtubeEmbedUrl = convertToEmbedUrl(presentationUrl);
            if (youtubeEmbedUrl) {
                const youtubeContainer = document.createElement('div');
                youtubeContainer.className = 'group-youtube-container';

                const youtubeIframe = document.createElement('iframe');
                youtubeIframe.src = youtubeEmbedUrl;
                youtubeIframe.frameBorder = '0';
                youtubeIframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
                youtubeIframe.allowFullscreen = true;
                youtubeIframe.className = 'group-youtube-iframe';

                youtubeContainer.appendChild(youtubeIframe);
                card.appendChild(youtubeContainer);
            }
        }
        // 画像のURLの場合
        else if (isImageUrl(presentationUrl)) {
            const imageContainer = document.createElement('div');
            imageContainer.className = 'group-image-container';

            // 複数の画像パスをセミコロン区切りで取得（シーク機能用）
            const imagePaths = presentationUrl.split(';').map(path => path.trim()).filter(path => path);

            const image = document.createElement('img');
            image.src = imagePaths[0] || presentationUrl;
            image.alt = group.theme || '発表資料';
            image.className = 'group-image';

            // 複数の画像がある場合、マウス位置に応じて画像を切り替える
            if (imagePaths.length > 1) {
                imageContainer.addEventListener('mousemove', (e) => {
                    const rect = imageContainer.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = x / rect.width;
                    const imageIndex = Math.floor(percentage * imagePaths.length);
                    const clampedIndex = Math.min(Math.max(imageIndex, 0), imagePaths.length - 1);
                    image.src = imagePaths[clampedIndex];
                });

                imageContainer.addEventListener('mouseleave', () => {
                    image.src = imagePaths[0];
                });
            }

            // 発表資料のURLがある場合は画像にリンクを追加
            const materialsUrl = getMaterialsUrl(group);
            if (materialsUrl && materialsUrl.trim() !== '') {
                const imageLink = document.createElement('a');
                imageLink.setAttribute('href', materialsUrl);
                imageLink.setAttribute('target', '_blank');
                imageLink.style.display = 'block';
                imageLink.style.width = '100%';
                // 複数の画像がある場合、リンクのpointer-eventsを無効化してマウスイベントを画像コンテナで処理
                if (imagePaths.length > 1) {
                    imageLink.style.pointerEvents = 'none';
                    // 画像コンテナをクリックしたときにリンクを開く
                    imageContainer.style.cursor = 'pointer';
                    imageContainer.addEventListener('click', () => {
                        window.open(materialsUrl, '_blank');
                    });
                }
                imageLink.appendChild(image);
                imageContainer.appendChild(imageLink);
            } else {
                imageContainer.appendChild(image);
            }

            card.appendChild(imageContainer);
        }
    } else {
        // プレゼンテーションURLがない場合はプレースホルダー画像を表示
        const imageContainer = document.createElement('div');
        imageContainer.className = 'group-image-container';

        const image = document.createElement('img');
        image.src = placeholderUrl;
        image.alt = 'スライドまたは発表風景';
        image.className = 'group-image';

        // 発表資料のURLがある場合は画像にリンクを追加
        const materialsUrl = getMaterialsUrl(group);
        if (materialsUrl && materialsUrl.trim() !== '') {
            const imageLink = document.createElement('a');
            imageLink.setAttribute('href', materialsUrl);
            imageLink.setAttribute('target', '_blank');
            imageLink.style.display = 'block';
            imageLink.style.width = '100%';
            imageLink.appendChild(image);
            imageContainer.appendChild(imageLink);
        } else {
            imageContainer.appendChild(image);
        }

        card.appendChild(imageContainer);
    }

    // 発表資料のURLがある場合のみボタンを表示
    const materialsUrl = getMaterialsUrl(group);
    if (materialsUrl && materialsUrl.trim() !== '') {
        const button = document.createElement('a');
        button.className = 'group-materials-button';
        button.href = materialsUrl;
        button.target = '_blank';
        button.rel = 'noopener noreferrer';
        button.innerHTML = '発表資料 <i class="fa-solid fa-arrow-up-right-from-square"></i>';
        card.appendChild(button);
    }

    return card;
}


// CSVファイルを読み込む
async function loadCSV() {
    try {
        const response = await fetch('data/data_5classes.csv');
        if (!response.ok) {
            throw new Error(`data_5classes.csvファイルが見つかりません (ステータス: ${response.status})`);
        }
        const text = await response.text();
        if (!text || text.trim().length === 0) {
            throw new Error('data_5classes.csvファイルが空です');
        }
        const lines = text.trim().split('\n');

        // ヘッダーを取得
        const headers = lines[0].split(',');

        // データをパース
        const cardsData = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            const values = parseCSVLine(line);

            if (values.length >= 4) {
                const card = {
                    class: values[0],
                    group: values[1],
                    theme: values[2],
                    presentationUrl: values[3] || '',
                    materialsUrl: values[4] || '',
                    pdfUrl: values[5] || ''
                };
                cardsData.push(card);
            }
        }

        const container = document.getElementById('list-container');

        // クラスごとにグループを分類
        const classesData = {};
        cardsData.forEach(card => {
            if (!classesData[card.class]) {
                classesData[card.class] = [];
            }
            classesData[card.class].push(card);
        });

        // 各クラス内のグループをA、B、Cの順に並べる
        const classOrder = ['水野クラス', '井口クラス', '高尾クラス', '八尾クラス', '山下クラス'];
        const groupOrder = ['グループA', 'グループB', 'グループC'];

        // すべてのグループを1つの配列にまとめる
        const allGroups = [];

        classOrder.forEach(className => {
            if (classesData[className]) {
                const sortedGroups = groupOrder.map(groupName => {
                    return classesData[className].find(g => normalizeGroupName(g.group) === groupName);
                }).filter(g => g !== undefined);
                allGroups.push(...sortedGroups);
            }
        });

        // 15グループ全体をシャッフル
        const shuffledGroups = shuffleArray(allGroups);

        // グループコンテナを作成
        const groupsContainer = document.createElement('div');
        groupsContainer.className = 'groups-container';

        // シャッフルされた順序で15グループを表示
        shuffledGroups.forEach(group => {
            const card = createGroupCard(group);
            groupsContainer.appendChild(card);
        });

        container.appendChild(groupsContainer);

    } catch (error) {
        console.error('CSV読み込みエラー:', error);
        const container = document.getElementById('list-container');
        if (container) {
            container.innerHTML =
                '<div style="text-align: center; color: red; padding: 2rem;">' +
                '<p style="font-size: 1.2rem; font-weight: bold; margin-bottom: 1rem;">データの読み込みに失敗しました</p>' +
                '<p style="margin-bottom: 0.5rem;">エラー: ' + error.message + '</p>' +
                '<p style="font-size: 0.9rem; color: #666;">data_5classes.csvファイルが存在することを確認してください。</p>' +
                '</div>';
        }
    }
}

// スクロール時にコンパクトなstickyヘッダーを表示
let isSticky = false;
let ticking = false;

function handleScroll() {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            const stickyHeader = document.getElementById('sticky-header');
            const scrollDownThreshold = 200; // 下にスクロールして200px超えたらsticky
            const scrollUpThreshold = 150; // 上にスクロールして150px以下になったら解除（ヒステリシス）

            if (!isSticky && window.scrollY > scrollDownThreshold) {
                stickyHeader.classList.add('show');
                isSticky = true;
            } else if (isSticky && window.scrollY < scrollUpThreshold) {
                stickyHeader.classList.remove('show');
                isSticky = false;
            }

            ticking = false;
        });
        ticking = true;
    }
}

// ページ読み込み時にCSVを読み込む
document.addEventListener('DOMContentLoaded', () => {
    loadCSV();

    // スクロールイベントリスナーを追加
    window.addEventListener('scroll', handleScroll);
});
