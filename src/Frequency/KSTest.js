/**
 * @fileoverview
 * This is a JavaScript conversion of a C# Kolmogorov-Smirnov (KS) goodness-of-fit test utility.
 * It has been refactored to be stateless and self-contained.
 */

import { RainUtils } from "./RainUtils.js";

// --- Main KSTest Class ---

export class KSTest {
    /**
     * @param {number} confidenceLevelIndex - Index for confidence level (0-4).
     *   Corresponds to [85%, 90%, 95%, 97.5%, 99%].
     */
    constructor(confidenceLevelIndex = 2) { // Default to 95%
        this.utils = new RainUtils();

        this.DistributionType = Object.freeze({
            Normal: 1,
            LogNormal: 2,
            PearsonType3: 3,
            LogPearsonType3: 4,
            ExtremeValueType1: 5
        });

        // Critical values for KS test
        this.KSalpha = [0.775, 0.819, 0.895, 0.995, 1.035]; // 85%, 90%, 95%, 97.5%, 99%

        if (confidenceLevelIndex < 0 || confidenceLevelIndex >= this.KSalpha.length) {
            throw new Error("Invalid confidenceLevelIndex.");
        }
        this.confidenceLevelIndex = confidenceLevelIndex;
        this.alpha = this.KSalpha[this.confidenceLevelIndex];
    }
    /**
     * 將數字陣列由大到小排序。
     * 這個版本使用 JavaScript 內建的 sort 方法，更簡潔、高效，且不會修改原始輸入陣列。
     * @param {number[]} data - 要排序的數字陣列。
     * @returns {number[]} 一個新的、已排序的數字陣列。
     */
    sortDescending(data) {
        // 1. 使用展開運算子 [...] 建立一個陣列的淺拷貝，以避免修改原始陣列。
        // 2. 使用內建的 sort() 方法，並傳入一個比較函式 (b - a) 來實現降序排序。
        return [...data].sort((a, b) => b - a);
    }

    /**
     * Runs the Kolmogorov-Smirnov goodness-of-fit test.
     * @param {number} distType - The distribution type from `this.DistributionType`.
     * @param {number[]} data - The array of raw sample data.
     * @returns {object} An object containing the full test results.
     */
    runTest(distType, data) {
        const N = data.length;
        if (N === 0) {
            throw new Error("Input data array cannot be empty.");
        }

        const sortedData = this.sortDescending(data);

        // Calculate critical value Ca for the confidence bands
        const Ca = this.alpha / (Math.sqrt(N) - 0.01 + 0.85 / Math.sqrt(N));

        // Determine if log-transformation is needed
        const requiresLog = distType === this.DistributionType.LogNormal || distType === this.DistributionType.LogPearsonType3;

        const transformedData = requiresLog
            ? sortedData.map(val => (val > 1e-6 ? Math.log10(val) : 0))
            : sortedData;

        // Calculate statistics on the (potentially transformed) data
        const { M: mean, SD: std, Cs: skew } = this.utils.statistics(transformedData);

        // Initialize result arrays
        const results = {
            obs: sortedData,
            est: [],
            lowerBound: [],
            upperBound: [],
            mark: [],
            prob: [],
            Ca: Ca,
            fitted: true
        };

        for (let i = 1; i <= N; i++) {
            // Use Weibull plotting position P = i / (n + 1)
            const rank = i;
            const px = this._plottingPosition(3, rank, N);
            results.prob.push(px);

            // double Hib = i / (double)N - Ca;
            // double lowb = (i - 1.0) / N + Ca;

            // Calculate the upper and lower probability bounds for the confidence band
            const probLower = (rank - 1.0) / N + Ca;
            const probUpper = rank / N - Ca;

            let zEst = NaN, zLow = NaN, zHigh = NaN;

            switch (distType) {
                case this.DistributionType.Normal:
                case this.DistributionType.LogNormal: {
                    const ktEst = this.utils.Look(1-px);
                    const ktLow = this.utils.Look(1-probLower);
                    const ktHigh = this.utils.Look(1-probUpper);

                    zEst = mean + std * ktEst;
                    if (!isNaN(ktLow)) zLow = mean + std * ktLow;
                    if (!isNaN(ktHigh)) zHigh = mean + std * ktHigh;
                    break;
                }
                case this.DistributionType.PearsonType3:
                case this.DistributionType.LogPearsonType3: {
                    // Using Wilson-Hilferty approximation for Kt, as gamma2x is not available
                    const ktEst = this._getPearson3Kt(this.utils.Look(1-px), skew);
                    const ktLow = this._getPearson3Kt(this.utils.Look(1-probLower), skew);
                    const ktHigh = this._getPearson3Kt(this.utils.Look(1-probUpper), skew);

                    zEst = mean + std * ktEst;
                    if (!isNaN(ktLow)) zLow = mean + std * ktLow;
                    if (!isNaN(ktHigh)) zHigh = mean + std * ktHigh;
                    break;
                }
                case this.DistributionType.ExtremeValueType1: {
                    const alpha = 0.7797 * std;
                    const mode = mean - 0.5772 * alpha;

                    // Note: Extreme uses exceedance probability (p)
                    const ktEst = this.utils.Extreme(px);
                    const ktLow = this.utils.Extreme(probLower);
                    const ktHigh = this.utils.Extreme(probUpper);

                    zEst = mode + alpha * ktEst;
                    if (!isNaN(ktLow)) zLow = mode + alpha * ktLow;
                    if (!isNaN(ktHigh)) zHigh = mode + alpha * ktHigh;
                    break;
                }
                default:
                    throw new Error(`Unsupported distribution type: ${distType}`);
            }

            // If log-transformed, convert values back to original scale
            if (requiresLog) {
                zEst = Math.pow(10, zEst);
                if (!isNaN(zLow)) zLow = Math.pow(10, zLow);
                if (!isNaN(zHigh)) zHigh = Math.pow(10, zHigh);
            }

            results.est.push(zEst);
            results.lowerBound.push(zLow);
            results.upperBound.push(zHigh);

            // Check if the observed value is outside the confidence bands
            let currentMark = 'G'; // Good
            const observedValue = sortedData[i - 1];
            if (!isNaN(zLow) && observedValue < zLow) {
                currentMark = '-'; // Below lower bound
                results.fitted = false;
            }
            if (!isNaN(zHigh) && observedValue > zHigh) {
                currentMark = '+'; // Above upper bound
                results.fitted = false;
            }
            results.mark.push(currentMark);
        }

        return results;
    }

    /**
     * Calculates the Pearson Type III frequency factor (Kt) using the Wilson-Hilferty approx.
     * @private
     */
    _getPearson3Kt(z, skew) {
        if (isNaN(z)) return NaN;
        const k = skew / 6.0;
        const z2 = z * z;
        const k2 = k * k;
        return z + (z2 - 1) * k + (1 / 3) * z * (z2 - 6) * k2 - (z2 - 1) * k2 * k + z * k2 * k2 + (1 / 3) * k2 * k2 * k;
    }

    /**
     * Calculates plotting position probability.
     * @private
     * double Ca = al / (sqrt(N) - 0.01 + 0.85 / sqrt(N));
     */
    _plottingPosition(method, rank, n) {
        let b = 0;
        switch (method) {
            case 1: b = 0.5; break;   // Hazen
            case 2: b = 0.3; break;   // Chegodayev
            case 3: b = 0.0; break;   // Weibull
            case 4: b = 3.0 / 8.0; break; // Blom
            case 5: b = 1.0 / 3.0; break; // Turkey
            case 6: b = 0.44; break;  // Gringorten
        }
        return (rank - b) / (n + 1.0 - 2.0 * b);
    }
}

// --- USAGE EXAMPLE ---
/*
try {
    // Sample data (e.g., annual maximum streamflow)
    const sampleData = [120, 150, 135, 160, 180, 145, 170, 190, 130, 210, 175, 165];

    // Initialize KS Test for 95% confidence level (index 2)
    const ksTest = new KSTest(2); 

    // Test against Log-Pearson Type III distribution
    const distType = ksTest.DistributionType.LogPearsonType3;
    
    const results = ksTest.runTest(distType, sampleData);

    console.log("Kolmogorov-Smirnov Test Results");
    console.log("===============================");
    console.log(`Goodness of fit: ${results.fitted}`);
    console.log(`Critical Value (Ca): ${results.Ca.toFixed(4)}`);
    console.log("\nData Points:");
    console.log("Observed | Lower Bound | Upper Bound | Estimated | Mark");
    console.log("----------------------------------------------------------");

    for (let i = 0; i < results.obs.length; i++) {
        const obs = results.obs[i].toFixed(2).padStart(8);
        const low = results.lowerBound[i] ? results.lowerBound[i].toFixed(2).padStart(11) : '      -    ';
        const high = results.upperBound[i] ? results.upperBound[i].toFixed(2).padStart(11) : '      -    ';
        const est = results.est[i].toFixed(2).padStart(9);
        const mark = results.mark[i].padStart(4);
        console.log(`${obs} | ${low} | ${high} | ${est} | ${mark}`);
    }

} catch (e) {
    console.error("An error occurred:", e.message);
}
*/
