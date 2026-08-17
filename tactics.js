// tactics.js (カテゴリ分類＆防衛力パラメータ追加版)

// 将棋の「筋（1~9）」と「段（1~9）」を内部インデックス {r, c} に変換する関数
const pos = (suji, dan) => ({
    r: dan - 1,   // 一段=0, 九段=8
    c: 9 - suji   // 1筋=8, 9筋=0
});

// CPU（後手/2P）が目指す完成形の目標配置リスト（防衛力スコア付き）
const CPU_CASTLES = {
    // ⚔️ 相手が「居飛車」の時に目指す囲いグループ
    VS_IBISHA: {
        YAGURA: {
            name: "金矢倉",
            defensivePower: 250, // 高防衛力！通常時はこれが第一優先
            targets: [
                { piece: 'OU', pos: pos(2, 2) },
                { piece: 'KA', pos: pos(4, 2) },
                { piece: 'KI', pos: pos(3, 2) },
                { piece: 'KI', pos: pos(4, 3) },
                { piece: 'GI', pos: pos(3, 3) },
                { piece: 'FU', pos: pos(4, 4) },
                { piece: 'FU', pos: pos(3, 4) }
            ]
        },
        KANI: {
            name: "カニ囲い",
            defensivePower: 200, // 早組できる急戦用（120→200へ上方修正！）
            targets: [
                { piece: 'OU', pos: pos(4, 1) },
                { piece: 'KI', pos: pos(3, 2) },
                { piece: 'KI', pos: pos(5, 2) },
                { piece: 'GI', pos: pos(4, 2) },
                { piece: 'FU', pos: pos(3, 4) },
                { piece: 'FU', pos: pos(4, 3) }

            ]
        }
    },
    // 🛡️ 相手が「振飛車」の時に目指す囲いグループ
    VS_FURIBISHA: {
        ELMO: {
            name: "エルモ囲い",
            defensivePower: 280, // 対振飛車の本格囲い
            targets: [
                { piece: 'OU', pos: pos(2, 2) },
                { piece: 'KI', pos: pos(3, 2) },
                { piece: 'GI', pos: pos(3, 1) },
                { piece: 'FU', pos: pos(2, 4) }
            ]
        },
        FUNA: {
            name: "舟囲い",
            defensivePower: 180, // スピーディな対抗形囲い
            targets: [
                { piece: 'OU', pos: pos(3, 1) },
                { piece: 'KI', pos: pos(4, 1) },
                { piece: 'GI', pos: pos(3, 2) },
                { piece: 'FU', pos: pos(2, 4) }
            ]
        }
    }
};



// ============================================================
// 🎯【新規追加】対局開始時に囲いを選択する関数（playCPUTurnの先頭で呼び出す）
// ============================================================
function selectCastleForCurrentGame() {
    // index.html のグローバル変数を参照（再宣言しない！）
    if (typeof currentTargetCastle !== 'undefined' && currentTargetCastle) {
        return; // すでに選択済み
    }
    // 相手（1P）の陣形をざっくり判定（居飛車か振飛車か）
    let isFuribisha = false;
    
    // 1Pの飛車の位置をチェック（初期位置のままなら居飛車、動いていれば振飛車とみなす）
    let hishaPos = null;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            let p = boardState[r] ? boardState[r][c] : null;
            if (p && p.p === 1 && p.t === 'HI') {
                hishaPos = { r, c };
                break;
            }
        }
        if (hishaPos) break;
    }

    // 飛車が初期位置（7七 or 8八 or 8二）から大きく動いていれば振飛車と判断
    if (hishaPos) {
        // 1Pの飛車初期位置は (7, 1) [7七] または (7, 7) [7三]
        if (hishaPos.c >= 5 || hishaPos.r >= 5) {
            isFuribisha = true;
        }
    }

    // 選択する囲いグループを決める
    let groupKey = isFuribisha ? 'VS_FURIBISHA' : 'VS_IBISHA';
    currentCastleGroupKey = groupKey;
    let group = CPU_CASTLES[groupKey];

    // グループ内からランダムに1つの囲いを選択（ゲームごとにバリエーション）
    let castleKeys = Object.keys(group);
    let selectedKey = castleKeys[Math.floor(Math.random() * castleKeys.length)];
    currentTargetCastle = group[selectedKey];

    // デバッグ用ログ（あれば）
    if (typeof addLog === 'function') {
        addLog(2, `🏰 CPUは【${currentTargetCastle.name}】を目指します！`);
    }
}




// 重複加点防止用の管理オブジェクト（一度完成した囲いは対局中に何度も加点しない）
let rewardedCastles = {};

// 対局開始時に呼び出してフラグをリセットする関数
function resetCastleFlags() {
    rewardedCastles = {};
}

// 🏰 盤面を走査して完成している囲いがあるか判定＆学習させる関数
function checkCpuCastleCompletion() {
    if (typeof gameMode !== 'undefined' && gameMode === 'pvp') return;

    // VS_IBISHA, VS_FURIBISHA の全囲いグループをループ
    Object.keys(CPU_CASTLES).forEach(groupKey => {
        const group = CPU_CASTLES[groupKey];
        
        Object.keys(group).forEach(castleKey => {
            const castle = group[castleKey];

            // すでにこの対局で加点済みならスキップ
            if (rewardedCastles[castleKey]) return;

            // 囲いの全ターゲット駒が指定座標（2P）に存在するか判定
            let isComplete = castle.targets.every(t => {
                let piece = boardState[t.pos.r] ? boardState[t.pos.r][t.pos.c] : null;
                return piece && piece.p === 2 && piece.t === t.piece;
            });

            // 囲いが完成していた場合！
            if (isComplete) {
                rewardedCastles[castleKey] = true; // 加点済みフラグを立てる

                // ログに通知表示
                if (typeof addLog === 'function') {
                    addLog(2, `🏰 CPU：陣形【${castle.name}】完成！(防衛力+${castle.defensivePower})`);
                }

                // 各構成駒の位置を「成功パターン（加点）」として記憶保存！
                if (typeof learnSuccessPattern === 'function') {
                    castle.targets.forEach(t => {
                        learnSuccessPattern(t.piece, t.pos.r, t.pos.c, castle.defensivePower, "castle");
                    });
                }
            }
        });
    });
}


// ============================================================
// 🎯【新規追加】現在の囲い目標を取得する関数（evaluateActionMidから呼び出す）
// ============================================================
function getCurrentCastleTarget() {
    return currentTargetCastle;
}



// ============================================================
// 🏰1P（先手）用の囲い選択関数（CPU vs CPU用）
// ============================================================
function selectCastleFor1P() {
    if (typeof currentTargetCastle1P !== 'undefined' && currentTargetCastle1P) {
        return;
    }

    // 2P（後手）の飛車の位置をチェック（相手の陣形を判定）
    let hishaPos = null;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            let p = boardState[r]?.[c];
            if (p && p.p === 2 && p.t === 'HI') {
                hishaPos = { r, c };
                break;
            }
        }
        if (hishaPos) break;
    }

    let isFuribisha = false;
    if (hishaPos && (hishaPos.c >= 5 || hishaPos.r >= 5)) {
        isFuribisha = true;
    }

    let groupKey = isFuribisha ? 'VS_FURIBISHA' : 'VS_IBISHA';
    let group = CPU_CASTLES[groupKey];

    let castleKeys = Object.keys(group);
    let selectedKey = castleKeys[Math.floor(Math.random() * castleKeys.length)];
    window.currentTargetCastle1P = group[selectedKey];

    if (typeof addLog === 'function') {
        addLog(1, `🏰 1P（先手）は【${window.currentTargetCastle1P.name}】を目指します！`);
    }
}
