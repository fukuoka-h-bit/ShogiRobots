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