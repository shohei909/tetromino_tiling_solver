import { usingMarker } from "./solver_root";

let dlxWorkers: Worker[] = [];

export async function startPacking_dlx(
    currentMarker: null | {},
    problem: PackingProblem,
    onSolved: (solution: PackingSolution) => void,
    onFinished: () => void
) {
    let dlxWorker = new Worker(new URL('./packing_ver_dlx_worker.ts', import.meta.url), { type: 'module' });
    dlxWorker.onmessage = (event) => {
        if (currentMarker != usingMarker) { return; }
        if (event.data.type === "solution") {
            onSolved(event.data.solution);
        } else if (event.data.type === "finished") {
            dlxWorker?.terminate();
            dlxWorkers.splice(dlxWorkers.indexOf(dlxWorker), 1);
            onFinished();
        }
    };
    dlxWorker.postMessage({ problem });
}

export async function abort_dlx_worker() {
    for (const worker of dlxWorkers) {
        worker.terminate();
    }
    dlxWorkers = [];
}
