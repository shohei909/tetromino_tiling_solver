// SharedArrayBufferの利用可否チェック
const alertDiv = document.getElementById('alert');
if (typeof SharedArrayBuffer === 'undefined') {
    if (alertDiv) {
        alertDiv.hidden = false;
        alertDiv.textContent = 'エラー: 必要な機能が利用できません。ページをリロードかキャッシュの削除で改善する場合があります。改善しない場合は、他のブラウザ(Chrome、Firefox、Edgeなど)をお使いください。';
    }
}
