import React from "react";
import * as api from "../utils/api";
import {useWebsocketScheduler} from "../utils/api";
import {topologicalSort, transformToChildrenGraph, transformToJobsDict} from "../utils/node";
import * as status from "../utils/status";
import {useParams} from "react-router-dom";
import JobLink from "./job_link";
import RequiresLogin from "./requires_login";
import ActionWithTooltip from "./action_with_tooltip";
import {cancelPipeline, updatePipeline} from "../utils/action_api";

function onNodeMouseEnter(job, nodesRef) {
    nodesRef.current[job.id]?.classList.add('highlighted_main');

    for (const parent of job.parents) {
        nodesRef.current[parent]?.classList.add('highlighted_extra');
    }

    for (const child of job.children) {
        nodesRef.current[child.id]?.classList.add('highlighted_extra');
    }

    // We need to convert it to array since we are both mutating the HTMLCollection,
    // which is live-updated, and iterating over it
    let paths = Array.from(document.getElementsByClassName(`path_${job.id}`));
    let svgOwner = paths[0]?.ownerSVGElement;

    for (let path of paths) {
        path.classList.add('highlighted');
        svgOwner.appendChild(path);
    }
}

function onNodeMouseLeave(job, nodesRef) {
    nodesRef.current[job.id]?.classList.remove('highlighted_main');

    for (const parent of job.parents) {
        nodesRef.current[parent]?.classList.remove('highlighted_extra');
    }

    for (const child of job.children) {
        nodesRef.current[child.id]?.classList.remove('highlighted_extra');
    }

    for (let path of document.getElementsByClassName(`path_${job.id}`)) {
        path.classList.remove('highlighted');
    }
}

export default function PipelinePage() {
    const params = useParams();
    const id = params.pipeline_id;

    let [name, setName] = React.useState('');
    let [statusId, setStatusId] = React.useState(0);
    let [tmpDir, setTmpDir] = React.useState('');
    let [commitHash, setCommitHash] = React.useState('');
    let [repoUrl, setRepoUrl] = React.useState('');
    let [stages, setStages] = React.useState([]);
    let [nodeDimensions, setNodeDimensions] = React.useState({});

    const refreshPipeline = React.useCallback(async () => {
        const data = await api.fetchDataFromGetApi(`fastci/api/pipeline/${id}`);

        if (data === null) {
            // TODO: Make a toast
            console.log('Failed to refresh pipeline!');
            return;
        }

        const transformedData = transformToJobsDict(data);
        setName(transformedData.name);
        setStatusId(transformedData.status);
        setTmpDir(transformedData.tmp_dir);
        setCommitHash(transformedData.commit_hash);
        setRepoUrl(transformedData.repo_url);
        setStages(topologicalSort(transformToChildrenGraph(transformedData.jobs)));
    }, [id]);

    useWebsocketScheduler(refreshPipeline);

    let nodesRef = React.useRef({});

    React.useEffect(() => {
        if (!nodesRef) {
            return;
        }
        let newDimensions = {};

        for (const [jobId, elem] of Object.entries(nodesRef.current)) {
            newDimensions[jobId] = {
                left: elem.offsetLeft,
                top: elem.offsetTop,
                width: elem.offsetWidth,
                height: elem.offsetHeight
            }
        }

        setNodeDimensions(newDimensions);
    }, [stages]);

    const statusClass = status.getPipelineStatusClass(statusId);

    let graphSegments = [];
    let edgePaths = [];

    for (const [i, stage] of Object.entries(stages)) {
        const jobNodes = stage.map((job, i) => {
            return (
                <div
                    className='pipeline_graph_node' key={i}
                    ref={elem => nodesRef.current[job.id] = elem}
                    onMouseEnter={onNodeMouseEnter.bind(null, job, nodesRef)}
                    onMouseLeave={onNodeMouseLeave.bind(null, job, nodesRef)}
                >
                    <JobLink job={job}/>
                </div>
            );
        });

        graphSegments.push(
            <div key={`${i}_stage`}>{jobNodes}</div>
        );

        if (Number(i) !== stages.length - 1) {
            graphSegments.push(<div key={`${i}_blank`}/>);
        }

        // FIXME: bug - connections are drawn incorrectly on first load - try to reaload everything
        //        to reproduce
        for (const from of stage) {
            for (const to of from.children) {
                if (!(from.id in nodeDimensions && to.id in nodeDimensions)) {
                    continue;
                }

                const horizontalGap = 50;
                const verticalGap = 20;
                // Set to this constant in css
                const height = 40;

                const fromDims = nodeDimensions[from.id];
                const toDims = nodeDimensions[to.id];

                const fromX = fromDims.left + fromDims.width;
                const fromY = fromDims.top + height / 2;

                const toX = toDims.left;
                const toY = toDims.top + toDims.height / 2;

                const to1X = fromX + horizontalGap;
                const to1Y = toY + (to.stageIdx !== from.stageIdx + 1) * Math.sign(from.idxInStage - to.idxInStage) * (verticalGap / 2 + height / 2);

                edgePaths.push(
                    <path
                        key={`${from.id}_${to.id}_1`}
                        className={`path_${from.id} path_${to.id}`}
                        stroke='#5f8ed2c7'
                        fill='none'
                        strokeWidth={2}
                        d={`M ${fromX} ${fromY} C ${to1X} ${fromY} ${fromX} ${to1Y} ${to1X} ${to1Y}`}
                    />
                );

                if (to.stageIdx !== from.stageIdx + 1) {
                    edgePaths.push(
                        <path
                            key={`${from.id}_${to.id}_2`}
                            className={`path_${from.id} path_${to.id}`}
                            stroke='#5f8ed2c7'
                            fill='none'
                            strokeWidth={2}
                            d={`M ${to1X} ${to1Y} H ${toDims.left - horizontalGap}`}
                        />
                    );

                    const from2X = toDims.left - horizontalGap;
                    const from2Y = to1Y;

                    edgePaths.push(
                        <path
                            key={`${from.id}_${to.id}_3`}
                            className={`path_${from.id} path_${to.id}`}
                            stroke='#5f8ed2c7'
                            fill='none'
                            strokeWidth={2}
                            d={`M ${from2X} ${from2Y} C ${toX} ${from2Y} ${from2X} ${toY} ${toX} ${toY}`}
                        />
                    );
                }
            }
        }
    }

    return (
        <RequiresLogin>
            <div className='pipeline_info_box'>
                <div>
                    <label>Id</label>
                    <label>{id}</label>
                </div>
                <div>
                    <label>Name</label>
                    <label>{name}</label>
                </div>
                <div>
                    <label>Status</label>
                    <label className={statusClass}>
                        {status.PIPELINE_STATUS_DESCRIPTION[statusId]}
                    </label>
                </div>
                <div>
                    <label>Tmp dir</label>
                    <label>{tmpDir || 'None'}</label>
                </div>
                <div>
                    <label>Repo</label>
                    <label>{repoUrl || 'None'}</label>
                </div>
                <div>
                    <label>Commit</label>
                    <label>{commitHash ? commitHash.slice(0, 7) : 'None'}</label>
                </div>
                <div>
                    <label>Actions</label>
                    {/*FIXME: label is redundant*/}
                    <label>
                        <ActionWithTooltip
                            onClick={updatePipeline.bind(null, id)}
                            iconClass='fas fa-sync running'
                            actionName='Update'/>
                        <ActionWithTooltip
                            onClick={cancelPipeline.bind(null, id)}
                            iconClass='fas fa-ban cancelled'
                            actionName='Cancel'/>
                    </label>
                </div>
            </div>
            <div className='pipeline_job_graph_box'>
                {/*We need this proxy div so the nodes and the svg scroll in sync if there's an*/}
                {/*overflow*/}
                <div>
                    <svg preserveAspectRatio='none'>
                        <defs>
                            <marker id='triangle' viewBox='0 0 10 10'
                                    refX='10' refY='5'
                                    markerUnits='strokeWidth'
                                    markerWidth='5' markerHeight='5'
                                    orient='auto'>
                                <path d='M 0 2 L 10 5 L 0 8 z' fill='#6d716d'/>
                            </marker>
                        </defs>
                        {edgePaths}
                    </svg>
                    <div>{graphSegments}</div>
                </div>
            </div>
        </RequiresLogin>
    );
}
