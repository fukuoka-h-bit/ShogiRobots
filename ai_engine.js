/**
 * 🧠 宇宙世紀ロボ将棋大戦 - 中級思考エンジン (ai_engine.js)
 */

// 🛡️ 王と王の前3マスの被保護状態をチェックする関数
function evaluateKingSafety(r, c, p) {
    let safetyScore = 0;
    let forwardR = (p === 1) ? -1 : 1;
    
    // 王自体の保護（利き枚数）
    let kingCover = getTileCoverCount(r, c, p);
    if (kingCover === 0) safetyScore -= 1000;
    else safetyScore += kingCover * 150;

    // 王の前3マスの保護状態をチェック
    for (let dc = -1; dc <= 1; dc++) {
        let fr = r + forwardR;
        let fc = c + dc;
        if (fr >= 0 && fr < 9 && fc >= 0 && fc < 9) {
            let frontCover = getTileCoverCount(fr, fc, p);
            if (frontCover === 0) {
                safetyScore -= 800;
            } else {
                safetyScore += frontCover * 100;
            }
        }
    }
    return safetyScore;
}

/**
 * 🎯 中級AI用 複合評価関数
 */
function evaluateNormalAI(actor, from, to, type) {
    let score = 0;
    let p = actor.p;
    let enemyP = (p === 1) ? 2 : 1;
    let totalTurns = totalTurnsCount || 0;
    let actorHp = actor.hp || 1;
    let isHighValuePiece = (actor.t !== 'FU'); // 👈 先頭で1回だけ安全に定義！

    // ============================================================
    // 👑 1. 徹底防衛ロジック
    // ============================================================
    let enemyHiC = -1;
    for (let er = 0; er < 9; er++) {
        for (let ec = 0; ec < 9; ec++) {
            let ep = boardState[er] ? boardState[er][ec] : null;
            if (ep && ep.p === enemyP && ep.t === 'HI') { enemyHiC = ec; break; }
        }
        if (enemyHiC >= 0) break;
    }
    let safeCastleCol = (enemyHiC >= 0 && enemyHiC >= 4) ? 2 : 6;

    if (actor.t === 'OU' || actor.t === 'KI' || actor.t === 'GI') {
        if (totalTurns <= 40) {
            let currentDist = Math.abs(from.c - safeCastleCol);
            let newDist = Math.abs(to.c - safeCastleCol);
            if (newDist < currentDist) {
                score += 800;
            }
        }
    }

    if (actor.t === 'OU') {
        score += evaluateKingSafety(from.r, from.c, p);
    }


    // ============================================================
    // ⚔️ 2. 攻撃兵科の限定
    // ============================================================
    if (type === 'move' || type === 'attack') {
        if (actor.t === 'FU' || actor.t === 'KE' || actor.t === 'GI' || actor.t === 'HI') {
            score += 300;
        }
    }

    // 🌟 14. 【成り駒無双】赤駒の優先活用 ＆ 王手ラッシュ ＆ 無駄歩抑制
    if (actor.promoted) {
        if (type === 'move' || type === 'attack' || type === 'special') {
            // ① 成り駒を動かす手自体に特大ボーナス！
            score += 1500; 

            // ② 敵陣深く（1P: 7~9段目, 2P: 1~3段目）で攻め立てる手
            let isEnemyZone = (p === 1) ? (to.r <= 2) : (to.r >= 6);
            if (isEnemyZone) {
                score += 800;
            }

            // ③ 相手の王・ボスに近づく「と金攻め・龍攻め」を爆発的評価！
            for (let kr = 0; kr < 9; kr++) {
                for (let kc = 0; kc < 9; kc++) {
                    let kp = boardState[kr] ? boardState[kr][kc] : null;
                    if (kp && kp.p === enemyP && (kp.t === 'OU' || kp.t === 'BOSS')) {
                        let currentDist = Math.abs(from.r - kr) + Math.abs(from.c - kc);
                        let newDist = Math.abs(to.r - kr) + Math.abs(to.c - kc);
                        if (newDist < currentDist) {
                            score += 1000;
                        }
                    }
                }
            }
        }
    }

    // 🚨 盤上に強い成り駒があるのに、自陣の無関係な歩をノコノコ進める手を抑制
    if (!actor.promoted && (actor.t === 'FU' || actor.t === 'KY') && type === 'move') {
        let hasPromotedPiece = false;
        for (let kr = 0; kr < 9; kr++) {
            for (let kc = 0; kc < 9; kc++) {
                let kp = boardState[kr] ? boardState[kr][kc] : null;
                if (kp && kp.p === p && kp.promoted) {
                    hasPromotedPiece = true;
                    break;
                }
            }
            if (hasPromotedPiece) break;
        }

        if (hasPromotedPiece) {
            score -= 800; // 👈 成り駒の攻めを優先させるためしっかり減点！
        }
    }

    // ============================================================
    // 🎯 3. 一点突破・集中砲火（2枚起点〜3枚・4枚利きによる囲い破壊）
    // ============================================================
    if (type === 'move' || type === 'attack') {
        let enemyCoverCount = getTileCoverCount(to.r, to.c, enemyP);
        let enemyCoverHp = getTileCoverHpSum(to.r, to.c, enemyP);
        
        let myCurrentCovers = getTileCoverCount(to.r, to.c, p);
        let myFutureCovers = myCurrentCovers + 1;

        // 💥 【A. 多重紐づけ・一点突破ボーナス】
        if (myFutureCovers >= 2) {
            if (myFutureCovers === 2) {
                score += 500;  // 2枚利き：攻撃の基本起点
            } else if (myFutureCovers === 3) {
                score += 1500; // 3枚利き：強固な一点突破！
            } else if (myFutureCovers >= 4) {
                score += 3000; // 4枚以上：相手の囲いを粉砕する絶対的集中砲火！
            }
        }

        // 🏰 【B. 囲い崩し（枚数勝利によるゴリ押し突破）】
        if (enemyCoverCount > 0) {
            if (myFutureCovers > enemyCoverCount) {
                let coverDiff = myFutureCovers - enemyCoverCount;
                score += 2000 + (coverDiff * 800);
            } else {
                score -= 1000; // 枚数負けしている無謀な特攻は自重
            }
        } else {
            // 🎯 【C. 隙・ノーガードマスへの突撃】
            if (myFutureCovers >= 2) {
                score += 1200;
            }
        }

        // 💥 4. 激戦区のHPSum（耐久火力）準備
        let myHpSum = getTileCoverHpSum(to.r, to.c, p);
        let enemyHpSum = enemyCoverHp;

        if (enemyCoverCount > 0 && myHpSum > enemyHpSum) {
            score += 1500 + ((myHpSum - enemyHpSum) * 200);
        }
    }

    // ============================================================
    // 🛡️ 5. 直線攻撃に対する「歩ガード」
    // ============================================================
    if (type === 'move' && actor.t === 'FU') {
        let enemyPenetrate = getPenetratingCoverCount(to.r, to.c, enemyP);
        if (enemyPenetrate > 0) score += 1000;
    }

    // ============================================================
    // 💥 6. 人間らしい『最後の大あがき（道連れ特攻）』ロジック
    // ============================================================
    if (isHighValuePiece && actorHp <= 1) {
        let currentlyAttacked = isTileAttackedByEnemy(from.r, from.c, enemyP);
        if (currentlyAttacked) {
            if (type === 'attack' || type === 'special') {
                let targetPiece = boardState[to.r] ? boardState[to.r][to.c] : null;
                if (targetPiece && targetPiece.p === enemyP) {
                    let targetVal = PIECE_VALUES[targetPiece.t] || 100;
                    score += 2500 + targetVal;
                }
            }
            if (type === 'move') score += 300;
        }
    }

    // 🚀 飛車（HI）が歩の手前で足踏みするのを防止
    if (actor.t === 'HI' && type === 'move') {
        let fwdR = actor.p === 1 ? to.r - 1 : to.r + 1;
        if (fwdR >= 0 && fwdR <= 8) {
            let frontPiece = boardState[fwdR] ? boardState[fwdR][to.c] : null;
            if (frontPiece && frontPiece.p === enemyP && frontPiece.t === 'FU') {
                let mySupport = getTileCoverCount(to.r, to.c, p);
                if (mySupport >= 1) score += 600;
                else score -= 400;
            }
        }
    }

    // ============================================================
    // 🚨 7. 【全高コスト駒徹底】反撃死つき攻撃の絶対禁止 ＆ スカウター退避
    // ============================================================
    if (isHighValuePiece && actorHp <= 1) {
        
        // 💥 【A. 反撃死つき攻撃の絶対ブロック】
        if (type === 'attack' || type === 'special') {
            let enemyCoversAtTarget = getTileCoverCount(to.r, to.c, enemyP);
            let targetPiece = boardState[to.r] ? boardState[to.r][to.c] : null;

            if (enemyCoversAtTarget >= 1) {
                let isGameEndingKill = targetPiece && (targetPiece.t === 'OU' || targetPiece.t === 'BOSS') && targetPiece.hp <= 1;
                
                if (!isGameEndingKill) {
                    let pieceCost = (typeof PIECE_COST_VALUES !== 'undefined' && PIECE_COST_VALUES[actor.t]) ? PIECE_COST_VALUES[actor.t] : 3;
                    score -= (3000 + pieceCost * 200);
                }
            }
        }

        // 🏃 【B. スカウター連動・危険エリアからの絶対退避】
        let currentEnemyCovers = getTileCoverCount(from.r, from.c, enemyP);

        if (currentEnemyCovers > 0) {
            if (type === 'move') {
                let toEnemyCovers = getTileCoverCount(to.r, to.c, enemyP);
                if (toEnemyCovers === 0) {
                    score += 4500;
                } else if (toEnemyCovers < currentEnemyCovers) {
                    score += 2000;
                }
            }

            if (type === 'attack' || type === 'special') {
                let enemyCoversAtTarget = getTileCoverCount(to.r, to.c, enemyP);
                if (enemyCoversAtTarget === 0) {
                    score += 4000;
                }
            }

        } else {
            if (type === 'move') {
                let toEnemyCovers = getTileCoverCount(to.r, to.c, enemyP);
                if (toEnemyCovers > 0) {
                    score -= 2500;
                }
            }
        }
    }

// ============================================================
    // 🛑 8. 飛車（HI）の無意味な左右うろうろ（横移動ループ）絶対禁止
    // ============================================================
    if (actor.t === 'HI' && type === 'move') {
        // 同一ner段（横移動 from.r === to.r）の移動チェック
        if (from.r === to.r) {
            // 移動先に攻撃対象（敵の射線や隙）がない無目的横移動は大減点！
            let enemyInLine = false;
            for (let er = 0; er < 9; er++) {
                let ep = boardState[er] ? boardState[er][to.c] : null;
                if (ep && ep.p === enemyP) {
                    enemyInLine = true;
                    break;
                }
            }

            if (!enemyInLine) {
                score -= 1500; // 👈 敵のいない筋への無意味な横往復を強力ブロック！
            } else {
                score -= 400;  // 敵の筋へ合わせる手でも、何度も反復移動するなら減点
            }
        }
    }

    // ============================================================
    // 🚫 9. 端桂（1七桂・9七桂など）の絶対禁止ロジック
    // ============================================================
    if (actor.t === 'KE' && type === 'move') {
        // 移動先が端（1筋: c===8、または 9筋: c===0）の場合
        if (to.c === 0 || to.c === 8) {
            score -= 2500; // 👈 端に跳ねて自滅する手を完全にブロック！
        } else if (to.c >= 2 && to.c <= 6) {
            score += 400;  // 中央（3〜7筋）への展開にはボーナス！
        }
    }

// ============================================================
    // 🛡️ 10. 自陣侵入・「と金」化を阻止する【防壁の打ち歩（8七歩など）】
    // ============================================================
    if (type === 'drop' && actor.t === 'FU') {
        // 1P（青）なら7段目（to.r === 6）、2P（黄）なら3段目（to.r === 2）への打ち歩チェック
        let isDefenseLineR = (p === 1) ? 6 : 2;
        
        if (to.r === isDefenseLineR) {
            // 前マス（1Pなら6段目: to.r - 1、2Pなら4段目: to.r + 1）に敵の駒がいるか
            let enemyFrontR = (p === 1) ? to.r - 1 : to.r + 1;
            if (enemyFrontR >= 0 && enemyFrontR < 9) {
                let frontEnemy = boardState[enemyFrontR] ? boardState[enemyFrontR][to.c] : null;

                // 敵の「歩」や敵駒が自陣直前まで肉薄している場合
                if (frontEnemy && frontEnemy.p === enemyP) {
                    
                    // 打ったマス（to）に後ろからの味方のサポート（角や飛車の利き）があるかチェック！
                    let mySupportCount = getTileCoverCount(to.r, to.c, p);

                    if (mySupportCount >= 1) {
                        score += 3500; // 👈 味方のバックアップがある完璧な防壁・打込み手に超特大ボーナス！
                    } else {
                        score += 2000; // 単体での前線ブロックでも強力加点！
                    }
                }
            }
        }
    }

// ============================================================
    // 📦 13. 持ち駒積極使用ロジック（溜め込み防止・戦力投入）
    // ============================================================
    if (type === 'drop') {
        // ① 持ち駒を打つ手に基本ボーナス（+1500）を与えて盤上移動より優先度を上げる！
        score += 1500;

        // ② 自分の持ち駒（captured[p]）の総数を正しくカウント
        let myHandCount = (typeof captured !== 'undefined' && captured[p]) ? captured[p].length : 0;

        // 持ち駒が溜まっている場合、さらに加算！
        if (myHandCount >= 2) {
            score += 800 + (myHandCount * 200); // 👈 溜め込むほど強力に打ち込みを誘発！
        }

        // ③ 銀・金・角・飛車・香車などの強力な持ち駒投入へのボーナス
        if (actor.t !== 'FU') {
            score += 500;
        }
    }

// ============================================================
    // 🎯 16. 【遠距離砲の積極削り】＆【高コスト優先撃破】ロジック
    // ============================================================
    if (type === 'attack' || type === 'special') {
        let targetPiece = boardState[to.r] ? boardState[to.r][to.c] : null;

        if (targetPiece && targetPiece.p === enemyP) {
            let targetCost = (typeof PIECE_COST_VALUES !== 'undefined' && PIECE_COST_VALUES[targetPiece.t]) 
                             ? PIECE_COST_VALUES[targetPiece.t] : 1;

            // 🎯 【A. 攻撃対象の比較：高コスト狙い優先ボーナス】
            // 敵駒のコストが高ければ高いほど、攻撃優先度を大きく加点！
            score += targetCost * 250; // （例: 歩=250点、銀=1000点、飛車=2750点ボーナス）

            // 💥 【B. 遠距離砲（飛・角・香）による積極削り】
            let dist = Math.max(Math.abs(to.r - from.r), Math.abs(to.c - from.c));
            let isRangedPiece = (actor.t === 'HI' || actor.t === 'KA' || actor.t === 'KY');

            if (isRangedPiece && dist >= 2) {
                // 1手で倒し切れなくても（相手HPが2以上でも）、安全圏からのアウトレンジ攻撃（削り）を強力推進！
                score += 1200;

                // 相手が反撃できない射程外からのノックバック・削りならさらに加点！
                let enemyCoversAtTarget = getTileCoverCount(to.r, to.c, enemyP);
                if (enemyCoversAtTarget === 0) {
                    score += 800; // 完全ノーリスクの削り砲撃
                }
            }
        }
    }    

    return score;
}