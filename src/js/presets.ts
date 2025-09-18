// Import our custom CSS
// @ts-ignore
import '../scss/style.scss'
import { hashToGrid } from './tool/hash';
type PresetData = {
    title: string,
    subtitle?: string,
    hash: string,
}
let data = new Map<string, PresetData[]>([
    ["td", [
        {
            "subtitle": "パフェ率:97.94% / TSDパフェ率:70.63%",
            "title":"迷走砲理想形・山岳積み2号理想形",
            "hash": "AAgKAAAAAAAREQAAABERABABERAAEREREBEREREQARERERAREREREQEREQAAAAAAAQAAAAAAAAAAAAAA",
        },
        {
            "subtitle": "パフェ率:96.87% / TSDパフェ率:68.89%",
            "title":"はちみつ砲理想形",
            "hash": "AAgKAAAAAAAREQAAABERABEAERAAEREREBEREREQARERERAREREREQEREQAAAAAAAQAAAAAAAAAAAAAA",
        },
        {
            "subtitle": "パフェ率:99.09% / TSDパフェ率:35.00%",
            "title":"ガムシロ積み理想形",
            "hash": "AAgKEAAAABEQAAAAEREQAAAREQAAERERAREREREAEREREQEREREREBEREQAAAAAAAQAAAAAAAAAAAAAA",
        },
        {
            "subtitle": "パフェ率:95.91% / TSDパフェ率:61.03%",
            "title":"山岳積み3号理想形",
            "hash": "AAgKEQAAAAARAAAAABERABEAERAAEREREBEREREQARERERAREREREQEREQAAAAAAAQAAAAAAAAAAAAAA",
        },
    ]],
    ["after-8line-td", [
        {
            "subtitle": "パフェ率:75.00% / TSDパフェ率:16.63%",
            "title":"3巡パフェ後しろみつ砲理想形・3巡パフェ後タンドリーチキン積み理想形",
            "hash": "AAgKEAAAEREQAAARERAAABERERAAAREREREBEREREAERERERARERERAREQAAAAAAAQEAAAAAAAAAAAAA",
        },
        {
            "subtitle": "パフェ率:67.30% / TSDパフェ率:31.90%",
            "title":"3巡パフェ後葉月積み理想形",
            "hash": "AAgKERAAAAEREAAAAREQAQAREQABERERAREREREAEREREQEREREREBEREQAAAAAAAQAAAAAAAAAAAAAA",
        },
        {
            "subtitle": "パフェ率:56.75% / TSDパフェ率:33.85%",
            "title":"I残し皐月積み理想形",
            "hash": "AAgKERAAAAEREAAAAREQARABEQABERERAREREREAEREREQEREREREBEREQAAAAAAAQAAAAAAAAAAAAAA",
        },
        {
            "subtitle": "パフェ率:52.74% / TSDパフェ率:6.03%",
            "title":"タンカー3巡パフェ後TD理想形",
            "hash": "AAgKEQAAARERAAABEREAABEREAAAEREQERERERABEREREBERERERAREREQAAAAAAAQAAAAAAAAAAAAAA",
        },
    ]],
    ["other", [
        {
            "title": "4段パフェ",
            "hash": "AAQKEREREREREREREREREREREREREREAAAAAAAAAAAAAAAAAAAAAAA",
        },
        {
            "title": "永劫回帰",
            "hash": "AAkKEAAAAAARAAAAAREAAAABEQAAARERAREBEREREBEREREQERERERAREREREBERAAAAAAAAAAAAAAAAAAAAAAA",
        },
    ]],
]);

window.addEventListener('DOMContentLoaded', () => {
    for (const sectionId of data.keys()) {
        let section = document.getElementById(sectionId);   
        if (!section) { continue; }
        let list = document.createElement('div');
        list.className = 'preset-list';

        for (const preset of data.get(sectionId) || []) {
            let card = document.createElement('div');
            card.className = 'preset-card';
            card.innerHTML = `
                <a href="./#${preset.hash}">
                    <div class=" d-flex align-items-middle justify-content-start" style="gap: 1.0rem;">
                        <h3 class="h5">${preset.title}</h3>
                        <div class="subtitle form-text">${preset.subtitle || ''}</div>
                    </div>
                </a>
            `;
            let a = card.getElementsByTagName('a')[0];
            let gridData = hashToGrid(preset.hash);
            if (gridData) {
                let canvas = document.createElement('canvas');
                let grid = gridData.grid;
                const cellSize = 9;
                canvas.width = grid[0].length * cellSize + 1;
                canvas.height = grid.length * cellSize + 1;
                let ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    for (let r = 0; r < grid.length; r++) {
                        for (let c = 0; c < grid[r].length; c++) {
                            ctx.fillStyle = grid[r][c] ? '#b9b9b9ff' : 'white';
                            ctx.fillRect(c * cellSize + 0.5, r * cellSize + 0.5, cellSize, cellSize);
                            ctx.strokeStyle = '#888';
                            ctx.strokeRect(c * cellSize + 0.5, r * cellSize + 0.5, cellSize, cellSize);
                        }
                    }
                    a.appendChild(canvas);
                }
            }
            list.appendChild(card);
        }
        section.appendChild(list);
    }
});
