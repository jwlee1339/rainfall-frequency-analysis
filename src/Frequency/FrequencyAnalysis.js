// FrequencyAnalysis.js
// 2025-08-29
// 水文頻率分析公用程式

import { RainUtils } from "./RainUtils.js";

/**
 * FrequencyAnalysis 類別執行基於不同統計分佈的頻率分析。
 */
export class FrequencyAnalysis {

    constructor() {
        /**
         * 頻率分析分佈型態的列舉
         * @readonly
         */
        this.DistributionType = Object.freeze({
            Normal: 1,
            LogNormal: 2,
            PearsonType3: 3,
            LogPearsonType3: 4,
            ExtremeValueType1: 5
        });

        /**
         * 頻率分析分佈型態選單
         * @type {string[]}
         */
        this.menuDr = [
            "常態分佈 (Normal)",
            "對數常態分佈 (Log-Normal)",
            "皮爾遜第三型分佈 (Pearson Type III)",
            "對數皮爾遜第三型分佈 (Log-Pearson Type III)",
            "極端值第一型分佈 (Extreme Value Type I)"
        ];

        /**
         * 信心水準選單
         * @type {string[]}
         */
        this.menuLevel = ["85%", "90%", "95%", "97.5%", "99%"];

        /**
         * @private
         */
        this.utils = new RainUtils();
    }

    /**
     * 計算三參數對數常態分佈的第三個參數 tau。
     * @param {number[]} X - 輸入資料陣列。
     * @returns {number} tau 參數值。
     */
    findTau(X) {
        const NoOfData = X.length;
        if (NoOfData < 3) return 0;

        const stats = this.utils.statistics(X);
        const { Xmin, Xmax } = stats;

        const y = this.utils.sort(X);
        const k = Math.floor(NoOfData / 2);

        // 計算中位數
        const Xmedian = (NoOfData % 2 !== 0)
            ? y[k] // 奇數個數
            : (y[k - 1] + y[k]) / 2; // 偶數個數

        const div = (Xmax + Xmin - 2 * Xmedian);
        let tau = 0;
        // 如果 div < 0，表示樣本可能為負偏態，不適合三參數對數常態分佈 (3P-LN)
        if (div > 0) {
            tau = (Xmax * Xmin - Math.pow(Xmedian, 2)) / div;
        }
        return tau;
    }

    /**
     * 頻率分析計算主程式。
     * @param {number} distType - 頻率分佈型態 (使用 this.DistributionType 中的值)。
     * @param {number[]} y - 原始資料陣列。
     * @param {number} T - 重現期 (年)。
     * @returns {{Kt: number, Qest: number}} 一個包含頻率因子(Kt)和推估值(Qest)的物件。
     */
    freq(distType, y, T) {
        // 1. 判斷是否需要對數轉換並準備資料
        const requiresLog = distType === this.DistributionType.LogNormal || distType === this.DistributionType.LogPearsonType3;

        const x = requiresLog
            ? y.map(val => (val > 1e-6 ? Math.log10(val) : 0)) // 避免對 0 或負數取對數
            : y.slice(); // 建立副本


        // 2. 計算基本統計量
        const stats = this.utils.statistics(x);
        const { M: mean, SD: std, Cs: cs } = stats;

        // 注意：此處 tau 被初始化為 0，與 C# 版本行為一致。
        // 若要實作三參數分佈，需要在此處呼叫 findTau()。
        const tau = 0;

        // 3. 根據分佈型態呼叫對應的計算方法
        const px = 1.0 / T; // 超過機率 (Exceedance Probability)
        const z = this.utils.Look(1 - px); // Look 函式需要的是累積機率

        let result;
        switch (distType) {
            case this.DistributionType.Normal:
                result = this._calculateNormal(mean, std, z);
                break;
            case this.DistributionType.LogNormal:
                result = this._calculateLogNormal(mean, std, z);
                break;
            case this.DistributionType.PearsonType3:
                result = this._calculatePearsonType3(mean, std, cs, z, tau);
                break;
            case this.DistributionType.LogPearsonType3:
                result = this._calculateLogPearsonType3(mean, std, cs, z, tau);
                break;
            case this.DistributionType.ExtremeValueType1:
                result = this._calculateExtremeValueType1(mean, std, px);
                break;
            default:
                throw new Error(`不支援的分佈型態: ${distType}`);
        }
        return result;
    }

    /** @private */
    _calculateNormal(mean, std, z) {
        const Kt = z;
        const Qest = mean + Kt * std;
        return { Kt, Qest };
    }

    /** @private */
    _calculateLogNormal(mean, std, z) {
        const { Kt, Qest: logQest } = this._calculateNormal(mean, std, z);
        const Qest = Math.pow(10, logQest);
        return { Kt, Qest };
    }

    /** @private */
    _calculatePearsonType3(mean, std, cs, z, tau) {
        // 使用 Wilson-Hilferty 轉換近似，計算頻率因子 Kt
        const k = cs / 6.0;
        const z2 = z * z;
        const k2 = k * k;
        const Kt = z + (z2 - 1.0) * k + (z * (z2 - 6.0)) * k2 / 3.0 - (z2 - 1.0) * k2 * k + z * k2 * k2 + k2 * k2 * k / 3.0;
        const Qest = mean + std * Kt + tau;
        return { Kt, Qest };
    }

    /** @private */
    _calculateLogPearsonType3(mean, std, cs, z, tau) {
        const { Kt, Qest: logQest } = this._calculatePearsonType3(mean, std, cs, z, tau);
        const Qest = Math.pow(10, logQest);
        return { Kt, Qest };
    }

    /** @private */
    _calculateExtremeValueType1(mean, std, px) {
        const alpha = 0.7797 * std;
        const mode = mean - 0.5772 * alpha;
        const Kt = this.utils.Extreme(px);
        const Qest = mode + alpha * Kt;
        return { Kt, Qest };
    }
}

// --- 使用範例 ---
/*
// 建立 FrequencyAnalysis 實例
const fa = new FrequencyAnalysis();

// 準備樣本資料 (例如：年最大流量)
const sampleData = [120, 150, 135, 160, 180, 145, 170, 190, 130, 210, 175, 165];

// 設定重現期 (例如：100年)
const returnPeriod = 100;

// 選擇分佈型態 (例如：皮爾遜第三型)
const distribution = fa.DistributionType.PearsonType3;

// 執行計算
try {
    const result = fa.freq(distribution, sampleData, returnPeriod);
    console.log(`分佈: ${fa.menuDr[distribution - 1]}`);
    console.log(`重現期 T = ${returnPeriod} 年`);
    console.log(`頻率因子 Kt = ${result.Kt.toFixed(4)}`);
    console.log(`推估值 Qest = ${result.Qest.toFixed(4)}`);
} catch (e) {
    console.error(e.message);
}

// --- 對數皮爾遜第三型範例 ---
const logDistribution = fa.DistributionType.LogPearsonType3;
try {
    const result = fa.freq(logDistribution, sampleData, returnPeriod);
    console.log(`\n分佈: ${fa.menuDr[logDistribution - 1]}`);
    console.log(`重現期 T = ${returnPeriod} 年`);
    console.log(`頻率因子 Kt = ${result.Kt.toFixed(4)}`);
    console.log(`推估值 Qest = ${result.Qest.toFixed(4)}`);
} catch (e) {
    console.error(e.message);
}
*/