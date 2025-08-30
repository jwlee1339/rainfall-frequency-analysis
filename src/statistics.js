// statistics.js
// 包含用於計算和處理降雨數據統計量的工具函式。

/**
 * 從解析後的降雨資料中提取所有的延時(duration)欄位。
 * @param {Array<Object>} data - 包含多年降雨資料的物件陣列，每個物件代表一年份的資料。
 * @returns {Array<number>} - 一個包含所有延時欄位且已排序的數值陣列 (例如 [60, 120, ...])，如果無資料則返回空陣列。
 */
export function getDurations(data) {
    // 檢查資料是否有效且至少有一筆紀錄
    if (!data || data.length === 0) {
        return [];
    }

    // 取得第一個資料物件的所有鍵 (即 CSV 的標頭)
    const allKeys = Object.keys(data[0]);

    // 過濾掉已知的非延時欄位 ('year', 'staNo')
    const durationKeys = allKeys.filter(key => key !== 'year' && key !== 'staNo');

    // 將延時字串轉換為數字，並進行排序
    return durationKeys.map(key => Number(key)).sort((a, b) => a - b);
}

/**
 * 從完整的降雨資料中，根據指定的延時(duration)篩選出對應的降雨量陣列。
 * @param {Array<Object>} data - 包含多年降雨資料的物件陣列。每個物件是一行資料。
 * @param {string|number} dur - 要提取資料的延時，對應 CSV 的欄位標頭 (例如 '60')。
 * @returns {Array<number>} - 包含所有年份在該延時下的降雨量陣列。
 */
export function getDurationRain(data, dur) {
    // 使用 Array.prototype.map 方法可以更簡潔地實現相同的功能。
    return data.map(row => row[dur]);
}

/**
 * 計算數值陣列的統計數據。
 * @param {number[]} dataArray - 一個包含數值的陣列 (例如，多年的降雨量數據)。
 * @returns {object|null} - 一個包含統計結果的物件，如果輸入無效則返回 null。
 *                          物件包含: max, min, mean, stdDev, cv, skewness。
 */
export function calculateStatistics(dataArray) {
    // 檢查輸入是否為有效陣列且至少有一個元素
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
        console.error("輸入的數據無效或為空陣列。");
        return null;
    }

    const n = dataArray.length;

    // 1. 計算總和 (Sum)
    const sum = dataArray.reduce((acc, val) => acc + val, 0);

    // 2. 計算平均值 (Mean, μ)
    const mean = sum / n;

    // 3. 計算最大值 (Max) 和最小值 (Min)
    const max = Math.max(...dataArray);
    const min = Math.min(...dataArray);

    // 4. 計算樣本標準偏差 (Sample Standard Deviation, s)
    //    水文分析中通常使用樣本標準差 (分母為 n-1)
    //    首先計算每個數據點與平均值的差的平方和
    const sumOfSquaredDiffs = dataArray.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
    //    樣本變異數 (Sample Variance)
    const variance = (n > 1) ? sumOfSquaredDiffs / (n - 1) : 0;
    //    樣本標準偏差是變異數的平方根
    const stdDev = Math.sqrt(variance);

    // 5. 計算變異係數 (Coefficient of Variation, CV)
    //    CV = 標準偏差 / 平均值
    const cv = (mean !== 0) ? stdDev / mean : 0;

    // 6. 計算偏態係數 (Skewness Coefficient, Cs)
    //    計算每個數據點與平均值的差的三次方的總和
    const sumOfCubedDiffs = dataArray.reduce((acc, val) => acc + Math.pow(val - mean, 3), 0);
    //    樣本偏態係數公式 (需要 n > 2)
    const skewness = (n > 2 && stdDev !== 0)
        ? (n / ((n - 1) * (n - 2))) * (sumOfCubedDiffs / Math.pow(stdDev, 3))
        : 0;

    return { max, min, mean, stdDev, cv, skewness };
}