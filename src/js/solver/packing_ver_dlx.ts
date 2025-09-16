import { usingMarker } from "./solver_root";

let dlxWorkers: Worker[] = [];
let workerPool: Worker[] = [];

export async function startPacking_dlx(
    currentMarker: null | {},
    problem: PackingProblem,
    onSolved: (solution: PackingSolution) => void,
    onFinished: () => void
) {
    let dlxWorker;
    if (workerPool.length > 0) {
        dlxWorker = workerPool.pop()!;
    } else {
        dlxWorker = new Worker(new URL('./packing_ver_dlx_worker.ts', import.meta.url), { type: 'module' });
    }
    dlxWorker.onmessage = (event) => {
        if (currentMarker != usingMarker) { return; }
        if (event.data.type === "solution") {
            onSolved(event.data.solution);
        } else if (event.data.type === "finished") {
            dlxWorkers.splice(dlxWorkers.indexOf(dlxWorker), 1);
            workerPool.push(dlxWorker);
            onFinished();
        }
    };
    dlxWorker.postMessage({ problem });
}

export async function abort_dlx_worker() {
    for (const worker of dlxWorkers) {
        worker.terminate();
    }
    for (const worker of workerPool) {
        worker.terminate();
    }
    dlxWorkers = [];
    workerPool = [];
}
