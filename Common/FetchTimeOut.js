// FetchTimeOut.js


// 具有time out 的Fetch

export const Ajax = async (url, options, time) => {
    const controller = new AbortController();
    setTimeout(() => {
        controller.abort();
    }, time);
    let config = { ...options, signal: controller.signal };
    try {
        let response = await fetch(url, config);
        let responseJson = await response.json();
        return responseJson;
    } catch (error) {
        // console.error(error);
        return undefined;
    }
}

/* 使用範例

const Fetch_wra_RstBase = async () => {
    let county_id = $("#county-select").val();
    let URL = "http://114.35.139.81:9527/getRstBaseByCounty/" + county_id;
    $("#reading-rstBase").html('讀取中');
    let json = await Ajax(URL, {}, 5000);
    if (json !== null)
    {
        # 存入全域變數
        RstList = json;
        $("#reading-rstBase").html('');
        console.log('雨量站名稱', json);
        let tr = genAreaTable(json);
        $("#rain-area-table").html(tr);
        genAutoComplteString(myJson);
    } else{
        console.log("Fetch Error!")
        $("#reading-rstBase").html('Fetch Error!');
    }
}

*/