// FindReturnPeriod.js
// refactored at 2021-12-17

/**
 * @class FindReturnPeriod
 * @description 根據頻率分析的結果，估計給定水文量（如降雨量）的重現期。
 */
export class FindReturnPeriod {

    /**
     * @param {Array<Object>} Global_FreqResults - 來自頻率分析的全域結果陣列。
     * 每個物件應包含一個名為 `estmateResults` 的屬性，該屬性是一個包含不同重現期對應估計值的陣列。
     */
    constructor(Global_FreqResults) {
        /**
         * @property {string[]} RpStr - 重現期區間的文字描述。
         * @private
         */
        this.RpStr = ["<1.11", "1.11~2", "2~5", "5~10", "10~20", "20~25",
            "25~50", "50~100", "100~200", "200~500", ">500"];
        /**
         * @property {Array<Object>} data - 儲存的頻率分析結果。
         * @private
         */
        this.data = Global_FreqResults;
    }

    /**
     * 根據一組重現期對應的估計值，找出給定數值所在的重現期區間。
     * @param {number} value - 要查詢的水文量。
     * @param {number[]} q - 按重現期排序的估計值陣列 (例如 [Q1.11, Q2, Q5...])。
     * @returns {string} - 對應的重現期區間文字描述，例如 "10~20年"。
     * @private
     */
    findReturnPeriod(value, q) {
        // search it
        let n = q.length;
        if (value < q[0])
            return this.RpStr[0] + "年";
        if (value > q[n - 1])
            return this.RpStr[n] + "年";

        let i = 1;
        for (i = 1; i < n - 1; i++) {
            if (value < q[i])
                break;
        }
        let k = i;
        return this.RpStr[k] + "年";
    }

    /**
     * 針對所有機率分佈，計算給定水文量的重現期。
     * @param {number} value - 要查詢的水文量（例如：降雨量）。
     * @returns {string[]} 一個包含每個分佈對應重現期字串的陣列。
     */
    findRP(value) {
        const results = [];
        for (let i = 0; i < this.data.length; i++) {
            const dist = this.data[i];
            // BUG FIX: The original implementation incorrectly sliced the array.
            // We should use the full array of estimated values for correct calculation.
            const q = Array.isArray(dist.estmateResults) ? dist.estmateResults : [];
            const s = this.findReturnPeriod(value, q);
            results.push(s);
        }
        return results;
    }
}