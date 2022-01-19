const UNTOUCHED = 0;
const INSIDE = 1;
const EXITED = 2;


function _dfs(node, nodeState, result) {
    nodeState[node.id] = INSIDE;

    for (let child of node.children) {
        if (nodeState[child.id] === INSIDE) {
            throw new Error('Cycle detected!');
        } else if (nodeState[child.id] === UNTOUCHED) {
            _dfs(child, nodeState, result);
        }
    }

    nodeState[node.id] = EXITED;
    result.push(node);
}

export function transformToJobsDict(pipeline) {
    let result = {...pipeline};
    let jobs = {};

    for (let job of pipeline.jobs) {
        jobs[job.id] = job;
    }

    result.jobs = jobs;
    return result;
}

// this is ugly - refactor somehow, to get rid of this function whatsoever
export function transformToChildrenGraph(jobs) {
    let result = {...jobs};

    for (const [id, job] of Object.entries(result)) {
        job.children = [];
    }

    for (const [id, job] of Object.entries(jobs)) {
        for (const parent_id of job.parents) {
            result[parent_id].children.push(job);
        }
    }

    return result;
}

export function topologicalSort(nodes) {
    let nodeState = {};

    for (let [id, node] of Object.entries(nodes)) {
        nodeState[id] = UNTOUCHED;
    }

    let result = [];

    for (let [id, node] of Object.entries(nodes)) {
        if (nodeState[id] === UNTOUCHED) {
            _dfs(node, nodeState, result);
        }
    }

    result.reverse();
    let nodeDepth = {};

    for (let [id, node] of Object.entries(nodes)) {
        nodeDepth[id] = 0;
    }

    let groupedResult = [];

    for (let node of result) {
        for (const parent_id of node.parents) {
            // TODO: don't know if this is correct
            nodeDepth[node.id] = Math.max(nodeDepth[node.id], nodeDepth[parent_id] + 1);
        }

        if (groupedResult.length === nodeDepth[node.id]) {
            groupedResult.push([node]);
        } else {
            groupedResult[nodeDepth[node.id]].push(node);
        }

        // Used in pipeline graph drawing
        node.stageIdx = nodeDepth[node.id];
        node.idxInStage = groupedResult[nodeDepth[node.id]].length - 1;
    }

    return groupedResult;
}
