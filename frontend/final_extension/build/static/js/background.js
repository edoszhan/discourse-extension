/******/ (() => { // webpackBootstrap
var __webpack_exports__ = {};
chrome.runtime.onMessage.addListener(request=>{if(request.action==='EXTRACT_ARTICLE_TEXT'){// Get the active tab and inject the extraction script
chrome.tabs.query({active:true,currentWindow:true},tabs=>{const activeTab=tabs[0];chrome.scripting.executeScript({target:{tabId:activeTab.id},files:['static/js/extractionScript.js']},()=>{if(chrome.runtime.lastError){console.error('Failed to inject script:',chrome.runtime.lastError);}else{chrome.tabs.sendMessage(activeTab.id,{action:'START_EXTRACTION'});}});});}return true;});let debounceTimer;let isFetching=false;chrome.runtime.onMessage.addListener(request=>{if(request.type==='ARTICLE_TEXT_EXTRACTED'){const{text,url}=request;if(isFetching){return;}isFetching=true;fetch("".concat("https://redesign-online-discourse.vercel.app","/api/website_check/").concat(encodeURIComponent(url))).then(response=>response.json()).then(data=>{if(data.exists){}else{clearTimeout(debounceTimer);debounceTimer=setTimeout(()=>{fetch("".concat("https://redesign-online-discourse.vercel.app","/generate-topics"),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,url})}).then(response=>response.json()).then(data=>{console.log('Generated Topics:',data.topics);}).catch(error=>{console.error('Error:',error);}).finally(()=>{isFetching=false;});},1000);}}).catch(error=>{console.error('Error:',error);}).finally(()=>{isFetching=false;});}});
/******/ })()
;
//# sourceMappingURL=background.js.map