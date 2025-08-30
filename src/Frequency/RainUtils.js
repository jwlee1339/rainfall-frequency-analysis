/**
 * @fileoverview
 * 這是一個從 C# 轉換而來的頻率分析工具。
 * 它提供了對多種統計分佈的頻率分析計算功能。
 * 包含的輔助類別 RainUtils 用於執行基本的統計計算。
 */

/**
 * RainUtils 類別提供了頻率分析所需的統計輔助函式。
 */
export class RainUtils {
    /**
     * 對數字陣列進行升序排序。
     * @param {number[]} arr - 輸入陣列。
     * @returns {number[]} 一個新的已排序陣列。
     */
    sort(arr) {
        // 使用 slice() 建立副本，避免修改原始陣列
        return arr.slice().sort((a, b) => a - b);
    }

    /**
     * 計算資料陣列的基本統計量。
     * @param {number[]} X - 輸入資料陣列。
     * @returns {{Xmin: number, Xmax: number, M: number, SD: number, Cv: number, Cs: number}} 包含統計結果的物件。
     */
    statistics(X) {
        const n = X.length;
        if (n === 0) {
            return { Xmin: 0, Xmax: 0, M: 0, SD: 0, Cv: 0, Cs: 0 };
        }

        const sum = X.reduce((acc, val) => acc + val, 0);
        const mean = sum / n;

        let sumSqDiff = 0;
        let sumCubeDiff = 0;
        for (const val of X) {
            sumSqDiff += Math.pow(val - mean, 2);
            sumCubeDiff += Math.pow(val - mean, 3);
        }
        
        // 樣本標準差 (n-1)
        const variance = n > 1 ? sumSqDiff / (n - 1) : 0;
        const stdDev = Math.sqrt(variance);

        // 偏態係數計算
        const M2 = sumSqDiff / n;
        const M3 = sumCubeDiff / n;
        const skewness = (n > 2 && M2 > 0) 
            ? (Math.sqrt(n * (n - 1)) / (n - 2)) * (M3 / Math.pow(M2, 1.5)) 
            : 0;

        const sortedX = this.sort(X);
        const min = sortedX[0];
        const max = sortedX[n - 1];

        return {
            Xmin: min,
            Xmax: max,
            M: mean,
            SD: stdDev,
            Cv: mean !== 0 ? stdDev / mean : 0,
            Cs: skewness
        };
    }

    /**
     * 標準常態分佈的累積機率反函數（Inverse CDF）近似值。
     * 使用 Abramowitz and Stegun 公式 26.2.23。
     * @param {number} p - 累積機率 (0 < p < 1)。
     * @returns {number} 對應的 Z-score。
     */
    Look(p) {
        if (p <= 0 || p >= 1) return NaN;
        if (p === 0.5) return 0;

        // 對於 p < 0.5，利用對稱性
        if (p < 0.5) {
            return -this.Look(1 - p);
        }

        const t = Math.sqrt(-2.0 * Math.log(1.0 - p));
        const c0 = 2.515517;
        const c1 = 0.802853;
        const c2 = 0.010328;
        const d1 = 1.432788;
        const d2 = 0.189269;
        const d3 = 0.001308;
        
        const numerator = c0 + c1 * t + c2 * t * t;
        const denominator = 1 + d1 * t + d2 * t * t + d3 * t * t * t;
        return t - numerator / denominator;
    }

    /**
     * 計算 Gumbel (極端值第一型) 分佈的簡化變數 (reduced variate)。
     * @param {number} px - 超過機率 (Exceedance Probability, 1/T)。
     * @returns {number} 簡化變數 Kt。
     */
    Extreme(px) {
        // 累積機率 F(x) = 1 - P(X > x) = 1 - px
        const Fx = 1 - px;
        return -Math.log(-Math.log(Fx));
    }
}



