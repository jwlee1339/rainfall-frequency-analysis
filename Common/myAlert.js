// myAlert.js
// 2021-12-13


export let GreenColor = "#4CAF50";
export let RedColor = "#f44336";
export let BlueColor = "#2196F3";
export let OrangeCOlor = "ff9800";

// 警告視窗
export function myAlert(contents, color) {
    // color = color || "green";
    // console.log(contents);
    let s = `${contents}`;
    $("#alertMessage").html(s).css("background-color", color).
        fadeIn(20).fadeOut(2000);
}
