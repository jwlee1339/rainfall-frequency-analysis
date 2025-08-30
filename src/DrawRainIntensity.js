// DrawHistograph.js
// 2021-12-17 refactored
// 2022-01-13 改為class

/**
 * @class DrawRainIntensity
 * @description 繪製歷年降雨強度直方圖(柱狀圖)的類別。
 * 負責處理資料、計算趨勢線並使用 Flot.js 繪製圖表。
 */
export class DrawRainIntensity {

    /**
     * @constructor
     * @param {Array<Object>} data - 從 CSV 解析出的完整降雨資料陣列。
     * @param {string} DOM - 用於繪製圖表的 DOM 元素的 jQuery 選擇器 (例如 "#rainChart")。
     */
    constructor(data, DOM) {
        this.dataJson = data;
        this.DOM = DOM;
    }

    /**
     * 計算線性迴歸。
     * y = m * x + b
     * @param {Array<Object>} xy - 包含 x, y 值的物件陣列，格式為 [{date: number, intens: number}, ...]。
     * @returns {{slope: number, intercept: number, cor: number}} - 包含斜率(m), 截距(b)和相關係數(cor)的物件。
     */
    LinearRegresstion(xy) {
        // 從 xy 物件陣列中取出 x (年份) 和 y (強度) 數據
        let x = [], y = [];
        for (let i = 0; i < xy.length; i++) {
            x.push(xy[i].date);
            y.push(xy[i].intens);
        }
        // 計算 x 和 y 的平均值
        let xAvg = 0.0;
        let yAvg = 0.0;
        for (let i = 0; i < x.length; i++) {
            xAvg += Number(x[i]);
            yAvg += Number(y[i]);
        }
        xAvg = xAvg / x.length;
        yAvg = yAvg / y.length;

        // 計算斜率 m
        let sumx = 0.0;
        let sumy = 0.0;
        let sumyy = 0.0;

        for (let i = 0; i < x.length; i++) {
            sumx += (x[i] - xAvg) * (y[i] - yAvg);
            sumy += (x[i] - xAvg) * (x[i] - xAvg);
            sumyy += (y[i] - yAvg) * (y[i] - yAvg);
        }
        let m = sumx / sumy;
        let b = yAvg - xAvg * m;

        // 計算相關係數 cor
        let cor = sumx / Math.sqrt(sumy) / Math.sqrt(sumyy);
        return { slope: m, intercept: b, cor: cor };
    }

    /**
     * 根據指定的延時(duration)準備繪圖所需的資料。
     * @param {string|number} duration - 要提取資料的延時，對應 CSV 的欄位標頭 (例如 '60')。
     * @returns {Array<Object>} - 格式為 [{date: 年份, intens: 降雨強度}, ...] 的陣列。
     */
    prepareData(duration) {
        // 使用 map 方法從原始資料中篩選出年份和對應延時的降雨強度
        return this.dataJson.map(row => ({
            date: row.year,
            intens: row[duration]
        }));
    }

    /**
     * 使用 Flot.js 繪製直方圖、平均值線和趨勢線。
     * @param {Array<Array<number>>} lines - 繪圖資料，格式為 [[年份, 降雨量, 趨勢線預測值?], ...]。
     * @param {number} avg - 該延時下的平均降雨量。
     */
    drawHistograph(lines, avg) {
        let barData = [];
        let maxY = Number(-1.0);
        let trendLineData = [];

        for (let i = 0; i < lines.length; i++) {
            let p = [];
            let tm = lines[i][0];
            p.push(tm);
            let y = parseFloat(lines[i][1]);
            let rain;
            if (y < -999) {
                y = null;
                rain = Number(0);
            } else {
                if (maxY < y) maxY = y;
                rain = y;
            }
            p.push(y);   // y
            barData.push(p);
        }

        // 準備趨勢線資料 (如果有的話)
        if (lines[0].length > 2) {
            for (let i = 0; i < lines.length; i++) {
                trendLineData.push([lines[i][0], lines[i][2]]);
            }
        }

        let r = lines.length;
        // 準備平均線資料
        let avgLineData = [[barData[0][0], avg], [barData[r - 1][0], avg]];
        let dataset = [{
            label: "雨量(mm)",
            color: "#009688",// teal   //"#2196F3",  // blue
            data: barData,
            yaxis: 1,
            bars: {
                show: true,
                barWidth: 0.9,
                fillColor: { colors: [{ opacity: 0.5 }, { opacity: 1 }] },
                lineWidth: 1,
                align: "center"
            }
        },
        {
            label: "平均值",  // w3-orange
            color: "#ff9800",
            data: avgLineData,
            lines: { show: true }
        },
        {
            label: "趨勢線",
            color: "#e91e63",  // w3-pink
            data: trendLineData,
            dashes: { show: true }
        }];

        let Ymax = maxY * 1.33;
        if (Ymax < maxY) Ymax = Math.ceil(maxY / 10) * 10;
        let Ytick = 20;
        if (maxY > 200 && maxY < 1000)
            Ytick = 50;
        if (maxY >= 1000)
            Ytick = 100;
        let barOptions = {
            series: {
            },
            xaxis: {
                tickFormatter: function (val, axis) { return val.toFixed(0) },
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 14,
                axisLabelFontFamily: '微軟正黑體',
                axisLabelPadding: 40
            },
            yaxes: [{
                position: "left",
                axisLabelFontSizePixels: 12,
                min: 0.0,
                max: Ymax,
                tickSize: Ytick,
                axisLabel: "降雨量(mm)"
            }
            ],
            grid: {
                hoverable: true
            },
            legend: {
                position: "nw",
                noColumns: 3,
                margin: [0, -22],
                show: true
            },
            tooltip: true,
            tooltipOpts: {
                content: "年份：%x年，雨量：%y.1 mm"
            }
        };
        $.plot(this.DOM, dataset, barOptions);
        return;
    } // end of function()

    /**
     * 繪製直方圖主函式。
     * 根據傳入的參數準備資料、計算趨勢線並呼叫繪圖函式。
     * @param {string|number} duration - 當前選擇的延時 (例如 '60')。
     * @param {Object} stats - 包含該延時統計數據的物件 (mean, stdDev 等)。
     * @param {boolean} trendLineChecked - 是否要繪製趨勢線的布林值。
     */
    plotHisto(duration, stats, trendLineChecked) {
        // 1. 根據延時準備資料
        const preparedData = this.prepareData(duration);

        // 2. 準備 Flot 繪圖所需的基本資料格式 [[年份, 降雨量], ...]
        let plotData = preparedData.map(d => [d.date, d.intens]);

        // 3. 如果需要，計算趨勢線並更新圖表副標題
        if (trendLineChecked) {
            const regression = this.LinearRegresstion(preparedData);
            
            // 將趨勢線的預測值(predY)加入到 plotData 中
            plotData = plotData.map((point, index) => {
                const x = point[0]; // 年份
                const predY = regression.slope * x + regression.intercept;
                return [x, point[1], predY]; // [年份, 降雨量, 趨勢線Y值]
            });

            // 更新副標題，包含平均值和年增率
            let s = `<strong>平均值: ${stats.mean.toFixed(1)}`;
            s += `(mm), 年增率: ${regression.slope.toFixed(2)}(mm/yr)</strong>`;
            $("#chart-subtitle").html(s);
        } else {
            // 更新副標題，只顯示平均值
            let s = `<strong>平均值: ${stats.mean.toFixed(1)}`;
            s += "(mm)</strong>";
            $("#chart-subtitle").html(s);
        }

        // 4. 呼叫繪圖函式，傳入處理好的資料和平均值
        this.drawHistograph(plotData, stats.mean);
    }
}
