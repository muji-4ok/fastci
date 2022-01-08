import React from "react";
import * as api from "../utils/api";
import {topologicalSort, transformToChildrenGraph, transformToJobsDict} from "../utils/node";
import * as status from "../utils/status";
import {useParams} from "react-router-dom";
import JobLink from "./job_link";
import RequiresLogin from "./requires_login";

export default function PipelinePage() {
    const params = useParams();
    const id = params.pipeline_id;

    let [name, setName] = React.useState('');
    let [statusId, setStatusId] = React.useState(0);
    let [jobs, setJobs] = React.useState([]);
    let [nodeDimensions, setNodeDimensions] = React.useState({});

    // TODO: This piece of shit still doesn't work properly...
    //       On a page refresh, edges don't update correctly right away
    React.useEffect(() => {
        async function refreshPipeline() {
            const data = await api.fetchDataFromApi(`fastci/api/pipeline/${id}`);

            if (data === null) {
                // TODO: Make a toast
                console.log('Failed to refresh pipeline!');
                return;
            }

            // @Speed - copying this each time just doesn't feel right
            const transformedData = transformToJobsDict(data);
            setName(transformedData.name);
            setStatusId(transformedData.status);
            setJobs(transformedData.jobs);
        }

        let intervalId = setInterval(refreshPipeline, 1000);
        // Ignoring for now
        refreshPipeline();

        return () => clearInterval(intervalId);
    }, [id]);

    const statusClass = status.getPipelineStatusClass(statusId);
    // @Speed - inefficient - copying and recalculating this here
    const stages = topologicalSort(transformToChildrenGraph(jobs));

    let graphSegments = [];
    let edgePaths = [];

    for (const [i, stage] of Object.entries(stages)) {
        const jobNodes = stage.map((job, i) => {
            return (
                <div className='pipeline_graph_node' key={i}
                     ref={elem => {
                         if (!elem) {
                             return;
                         }

                         let newDimensions = {...nodeDimensions};

                         newDimensions[job.id] = {
                             left: elem.offsetLeft,
                             top: elem.offsetTop,
                             width: elem.offsetWidth,
                             height: elem.offsetHeight
                         }

                         if (!(job.id in nodeDimensions) ||
                             (nodeDimensions[job.id].left !== newDimensions[job.id].left) ||
                             (nodeDimensions[job.id].top !== newDimensions[job.id].top) ||
                             (nodeDimensions[job.id].width !== newDimensions[job.id].width) ||
                             (nodeDimensions[job.id].height !== newDimensions[job.id].height)) {
                             setNodeDimensions(newDimensions);
                         }
                     }}>
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
