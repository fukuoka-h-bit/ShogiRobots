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