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

export default function PipelinePage() {
    const params = useParams();
    const id = params.pipeline_id;

    let [name, setName] = React.useState('');
    let [statusId, setStatusId] = React.useState(0);
    let [tmpDir, setTmpDir] = React.useState('');
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
                <div className='pipeline_graph_node' key={i}
                     ref={elem => nodesRef.current[job.id] = elem}>
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

        for (const from of stage) {
            for (const to of from.children) {
                if (!(from.id in nodeDimensions && to.id in nodeDimensions)) {
                    continue;
                }

                const fromDims = nodeDimensions[from.id];
                const toDims = nodeDimensions[to.id];

                const fromX = fromDims.left + fromDims.width;
                const fromY = fromDims.top + fromDims.height / 2;

                const toX = toDims.left;
                const toY = toDims.top + toDims.height / 2;

                const midX = (fromX + toX) / 2;

                edgePaths.push(
                    <path
                        key={`${from.id}_${to.id}`}
                        stroke='#5f8ed2c7'
                        fill='none'
                        strokeWidth={2}
                        markerEnd='url(#triangle)'
                        d={`M ${fromX} ${fromY} C ${midX} ${fromY} ${midX} ${toY} ${toX} ${toY}`}
                    />
                );
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
