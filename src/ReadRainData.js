// ReadRainData.js
// 2025-08-28
// 讀取歷年各延時降雨資料csv

/**
 * 異步函數，用於獲取並解析 CSV 字串。
 * @param {string} csvText - CSV 文字。
 * @returns {Array<Object>|null} - 解析後會得到一個物件陣列，或在出錯時為 null。
 */
export function parseCSV(csvText) {
    try {

        // 2. 將文本按行分割，並過濾掉空行
        const lines = csvText.trim().split('\n');

        // 3. 獲取標頭 (CSV 的第一行)
        const headers = lines[0].split(',');

        // 4. 處理資料行 (從第二行開始)
        const data = lines.slice(1).map(line => {
            const values = line.split(',');
            const rowObject = {};

            // 將每一行的值與標頭對應起來，建立一個物件
            headers.forEach((header, index) => {
                const value = values[index];
                // 嘗試將值轉換為數字，如果轉換失敗則保留為原始字串
                // .trim() 用於移除可能的空格
                rowObject[header.trim()] = isNaN(Number(value)) ? value : Number(value);
            });
            return rowObject;
        });

        return data;
    } catch (error) {
        console.error("解析 CSV 檔案時發生錯誤:", error);
        return null;
    }
}

// --- 使用範例 ---
/**
 * 讀取歷年各延時降雨資料csv
 * @param {string} csvFilePath - csv檔案名稱, ex. "data/466990.csv"
 * @returns 
 */
export async function ReadRainData(csvFilePath) {
    // 假設您的 CSV 檔案位於與 HTML 檔案同層級的 'data' 資料夾中
    // 1. 使用 fetch 獲取檔案內容
    const response = await fetch(filePath);
    if (!response.ok) {
        throw new Error(`無法獲取檔案，狀態碼: ${response.status}`);
    }
    const csvText = await response.text();
    // 使用 await 等待 parseCSV 異步函數完成，並直接獲取解析後的資料。
    // 這種寫法比 .then() 更簡潔，且能正確從 async 函數返回值。
    const data = parseCSV(csvText);

    // 檢查資料是否成功解析 (data 不為 null)
    if (data) {
        // 在控制台輸出成功訊息和部分資料，方便開發時調試
        console.log("CSV 檔案解析成功:");
        console.log("總行數:", data.length);
        console.log("前三行資料:", data.slice(0, 3));

        // 範例：存取第一行的特定資料
        const firstRow = data[0];
        console.log(`年份: ${firstRow.year}, 站號: ${firstRow.staNo}, '60' 欄位的值: ${firstRow['60']}`);

        // 從 async 函數返回解析後的資料
        return data;
    } else {
        // 如果資料為 null，表示解析過程中發生錯誤
        console.log("解析 CSV 檔案時發生錯誤。");
        // 返回 null，讓調用此函數的地方可以進行錯誤處理
        return null;
    }
}