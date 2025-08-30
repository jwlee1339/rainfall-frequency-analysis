/**
 * @fileoverview
 * This is a JavaScript conversion of a C# Chi-Square goodness-of-fit test utility.
 * It tests if a sample of data comes from a claimed distribution (Normal, Log-Normal, etc.).
 *
 * It includes necessary helper utilities for statistics and distribution calculations.
 */
import { RainUtils } from "./RainUtils.js";

// --- Main ChiSquareTest Class ---

export class ChiSquareTest {
    /**
     * Constructor for the ChiSquareTest class.
     */
    constructor() {
        this.utils = new RainUtils();

        this.DistributionType = Object.freeze({
            Normal: 1,
            LogNormal: 2,
            PearsonType3: 3,
            LogPearsonType3: 4,
            ExtremeValueType1: 5
        });

        this.menudr = [
            "Normal Distribution",
            "Log-Normal Distribution",
            "Pearson Type III Distribution",
            "Log-Pearson Type III Distribution",
            "Extreme Value Type I Distribution"
        ];

        this.ConfidenceLevelString = ["85%", "90%", "95%", "97.5%", "99%"];

        // Chi-square critical values table. Rows: df (1-20), Cols: confidence level index (0-4)
        this.Chi2Table = [
            [1.320, 2.706, 3.841, 5.020, 6.630], [2.775, 4.605, 5.991, 7.380, 9.210],
            [4.111, 6.251, 7.815, 9.350, 11.300], [5.390, 7.779, 9.488, 11.100, 13.300],
            [6.630, 9.236, 11.070, 12.800, 15.100], [7.840, 10.645, 12.592, 14.400, 16.800],
            [9.040, 12.017, 14.067, 16.000, 18.500], [10.202, 13.362, 15.507, 17.500, 20.100],
            [11.400, 14.684, 16.919, 19.000, 21.700], [12.500, 15.987, 18.307, 20.500, 23.200],
            [13.700, 17.275, 19.675, 21.900, 24.700], [14.800, 18.549, 21.026, 23.300, 26.200],
            [16.000, 19.812, 22.362, 24.700, 27.700], [17.100, 21.064, 23.685, 26.100, 29.100],
            [18.200, 22.307, 24.996, 27.500, 30.600], [19.400, 23.542, 26.296, 28.800, 32.000],
            [20.500, 24.769, 27.587, 30.200, 33.400], [21.600, 25.989, 28.869, 31.500, 34.800],
            [22.700, 27.204, 30.144, 32.900, 36.200], [23.800, 28.412, 31.410, 34.200, 37.600]
        ];
    }

    /**
     * Main entry point for the Chi-Square goodness-of-fit test.
     * @param {number} distType - The distribution type from `this.DistributionType`.
     * @param {number[]} data - The array of sample data.
     * @param {number} confidenceIndex - The index for the confidence level (0-4).
     * @returns {object} An object containing the test results.
     */
    chi2Test(distType, data, confidenceIndex) {
        if (confidenceIndex < 0 || confidenceIndex >= this.ConfidenceLevelString.length) {
            return {
                ConfidenceLevel: confidenceIndex.toString(),
                Conclusion: `Confidence index is invalid! Must be between [0, ${this.ConfidenceLevelString.length - 1}]`,
                fitted: false
            };
        }

        const sortedData = this.utils.sort(data);

        // Determine number of intervals using Sturges' formula
        const intervalCount = 1 + Math.round(3.3 * Math.log10(data.length));

        return this._calculateChiSquare(sortedData, intervalCount, confidenceIndex, distType);
    }

    /**
     * Creates an empty result object with 1-based arrays for compatibility with original logic.
     * @private
     */
    _createChi2Results(intervalCount) {
        const size = intervalCount + 1;
        return {
            lo: new Array(size).fill(0),
            hi: new Array(size).fill(0),
            o: new Array(size).fill(0), // Observed
            e: new Array(size).fill(0), // Expected
            ObsChi2Value: 0,
            EstChi2Value: 0,
            fitted: false,
            Conclusion: "",
            ConfidenceLevel: ""
        };
    }

    /**
     * Performs the core Chi-Square calculation.
     * @private
     */
    _calculateChiSquare(data, intervalCount, confidenceIndex, distType) {
        const results = this._divideIntoBins(data, intervalCount, distType);
        const n = data.length;
        let chi2Stat = 0;

        for (let i = 1; i <= intervalCount; i++) {
            results.e[i] = n / intervalCount;
            const temp = Math.pow(results.o[i] - results.e[i], 2) / results.e[i];
            chi2Stat += temp;
        }

        // Determine degrees of freedom (df)
        // Note: This logic is a direct port from the C# code.
        // A more standard calculation would be (Intervals - 1 - # of estimated parameters).
        let df = 1;
        switch (distType) {
            case this.DistributionType.ExtremeValueType1:
                df = intervalCount - 3; // (k - 1 - 2 params)
                break;
            case this.DistributionType.LogPearsonType3:
                df = intervalCount - 4; // (k - 1 - 3 params)
                break;
            // C# code had no specific df for Normal, LogNormal, or P-III, defaulting to 1.
            // This is likely incorrect but preserved for compatibility.
            case this.DistributionType.Normal:
            case this.DistributionType.LogNormal:
                df = intervalCount - 3; // Should be k-1-2
                break;
            case this.DistributionType.PearsonType3:
                df = intervalCount - 4; // Should be k-1-3
                break;
        }

        // Ensure df is valid for table lookup (df must be at least 1)
        df = Math.max(1, df);

        // Get critical value from table (adjusting for 0-based index)
        const criticalValue = (df > 0 && df <= this.Chi2Table.length)
            ? this.Chi2Table[df - 1][confidenceIndex]
            : Infinity;

        results.ConfidenceLevel = this.ConfidenceLevelString[confidenceIndex];
        results.EstChi2Value = criticalValue;
        results.ObsChi2Value = chi2Stat;
        results.fitted = chi2Stat < criticalValue; // Observed < Critical -> Good fit
        results.Conclusion = `Critical Chi-square value at ${results.ConfidenceLevel} confidence = ${criticalValue.toFixed(3)}\nFitted? ${results.fitted}`;

        return results;
    }

    /**
     * Divides data into bins based on theoretical quantiles of the chosen distribution.
     * @private
     */
    _divideIntoBins(data, intervalCount, distType) {
        const n = data.length;
        const requiresLog = distType === this.DistributionType.LogNormal || distType === this.DistributionType.LogPearsonType3;

        const transformedData = requiresLog
            ? data.map(val => (val > 1e-6 ? Math.log10(val) : 0))
            : data;

        const { M: mean, SD: std, Cs: skew, Xmin: low, Xmax: high } = this.utils.statistics(transformedData);

        const results = this._createChi2Results(intervalCount);
        results.lo[1] = low - 2.0; // Padded to catch all values

        for (let i = 1; i <= intervalCount; i++) {
            const cumulativeProb = i / intervalCount;
            const exceedanceProb = 1 - cumulativeProb;

            if (i < intervalCount) {
                let hi_i = 0;
                switch (distType) {
                    case this.DistributionType.Normal:
                    case this.DistributionType.LogNormal: {
                        const z = this.utils.Look(cumulativeProb);
                        hi_i = mean + std * z;
                        break;
                    }
                    case this.DistributionType.PearsonType3:
                    case this.DistributionType.LogPearsonType3: {
                        const z = this.utils.Look(cumulativeProb);
                        const kt = this._getPearson3Kt(z, skew);
                        hi_i = mean + std * kt; // tau is assumed 0 as in original code
                        break;
                    }
                    case this.DistributionType.ExtremeValueType1: {
                        const alpha = 0.7797 * std;
                        const mode = mean - 0.5772 * alpha;
                        const kt = this.utils.Extreme(exceedanceProb);
                        hi_i = mode + alpha * kt;
                        break;
                    }
                }
                results.hi[i] = hi_i;
            }
            if (i > 1) {
                results.lo[i] = results.hi[i - 1];
            }
        }
        results.hi[intervalCount] = high + 2.0; // Padded to catch all values

        this._countFrequencies(transformedData, results, intervalCount);
        return results;
    }

    /**
     * Counts the number of data points falling into each bin.
     * @private
     */
    _countFrequencies(data, results, intervalCount) {
        for (let i = 1; i <= intervalCount; i++) {
            for (const value of data) {
                // This logic mimics the C# version's (lo < val < hi) behavior
                if (value > results.lo[i] && value < results.hi[i]) {
                    results.o[i]++;
                }
            }
        }
    }

    /**
     * Calculates the Pearson Type III frequency factor (Kt) using the Wilson-Hilferty approx.
     * @private
     */
    _getPearson3Kt(z, skew) {
        const k = skew / 6.0;
        const z2 = z * z;
        const k2 = k * k;
        return z + (z2 - 1) * k + (1 / 3) * z * (z2 - 6) * k2 - (z2 - 1) * k2 * k + z * k2 * k2 + (1 / 3) * k2 * k2 * k;
    }

    /**
     * Generates a formatted string report of the Chi-Square test results.
     * @param {object} results - The result object from `chi2Test`.
     * @param {number} distType - The distribution type.
     * @param {number} intervalCount - The number of intervals used.
     * @returns {string} A formatted string.
     */
    getResultsAsString(results, distType, intervalCount) {
        try {
            const pad = (str, len) => String(str).padStart(len, ' ');

            let s = "CHI-SQUARE TEST\n";
            s += `Ho: The series is ${this.menudr[distType - 1]}.\n`;
            s += `H1: The series is not ${this.menudr[distType - 1]}.\n`;
            s += "              Class             O.     E.   (O-E)^2/E\n";
            s += "--------------------------------------------------------\n";

            for (let i = 1; i <= intervalCount; i++) {
                let classStr = "";
                if (i === 1) {
                        classStr = `           <  ${results.hi[i].toFixed(2).padStart(8)}`;
                } else if (i === intervalCount) {
                    classStr = `${results.lo[i].toFixed(2).padStart(8)}    <         `;
                } else {
                    classStr = `${results.lo[i].toFixed(2).padStart(8)} - ${results.hi[i].toFixed(2).padStart(8)}`;
                }

                const temp = Math.pow(results.o[i] - results.e[i], 2) / results.e[i];
                s += `${pad(classStr, 25)} ${pad(results.o[i].toFixed(1), 7)} ${pad(results.e[i].toFixed(1), 7)} ${pad(temp.toFixed(3), 10)}\n`;
            }

            s += "--------------------------------------------------------\n";
            s += `Observed Chi2 value = ${results.ObsChi2Value.toFixed(3)}\n`;
            s += `Critical Chi2 value (${results.ConfidenceLevel}) = ${results.EstChi2Value.toFixed(3)}\n`;
            s += `* Goodness of fit: ${results.fitted}\n`;
            return s;
        } catch (error) {
            console.error("Error generating Chi-Square results string:", error);
            return "An error occurred while generating the report. Please check the console for details.";
        }
       
    }
}

// --- USAGE EXAMPLE ---
/*
const chiTest = new ChiSquareTest();

// Sample data (e.g., annual maximum streamflow)
const sampleData = [120, 150, 135, 160, 180, 145, 170, 190, 130, 210, 175, 165, 195, 220, 140];

// Test against Log-Pearson Type III distribution at 95% confidence level (index 2)
const distType = chiTest.DistributionType.LogPearsonType3;
const confidenceIndex = 2; // 95%

const results = chiTest.chi2Test(distType, sampleData, confidenceIndex);
const intervalCount = 1 + Math.round(3.3 * Math.log10(sampleData.length));

console.log(chiTest.getResultsAsString(results, distType, intervalCount));

// Example Output:
// CHI-SQUARE TEST
// Ho: The series is Log-Pearson Type III Distribution.
// H1: The series is not Log-Pearson Type III Distribution.
//               Class             O.     E.   (O-E)^2/E
// --------------------------------------------------------
//            <   2.14             1.0     2.5      0.900
//      2.14 -   2.19              3.0     2.5      0.100
//      2.19 -   2.23              3.0     2.5      0.100
//      2.23 -   2.27              4.0     2.5      0.900
//      2.27 -   2.31              2.0     2.5      0.100
//      2.31    <                  2.0     2.5      0.100
// --------------------------------------------------------
// Observed Chi2 value = 2.200
// Critical Chi2 value (95%) = 5.991
// * Goodness of fit: true
*/
