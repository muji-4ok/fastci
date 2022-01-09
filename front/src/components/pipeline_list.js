import React from "react";
import * as api from "../utils/api";
import {useWebsocketScheduler} from "../utils/api";
import {topologicalSort, transformToChildrenGraph, transformToJobsDict} from "../utils/node";
import * as status from "../utils/status";
import {Link} from "react-router-dom";
import ActionWithTooltip from "./action_with_tooltip";
import {cancelPipeline, updatePipeline} from "../utils/action_api";
import RequiresLogin from "./requires_login";
import PipelineCreatePage from "./pipeline_create";
import JobLink from "./job_link";

export default function PipelineListPage() {
    // TODO: @Speed - redrawing **everything** on each button click is very slow

    let [data, setData] = React.useState([]);
    let [openDropdownState, setOpenDropdownState] = React.useState({
        pipelineId: null,
        stageIndex: null
    });

    // let [searchParams, setSearchParams] = useSearchParams();
    // const listOffset = searchParams.get('offset') || 0;
    // const listSize = searchParams.get('size') || 20;

    const refreshList = React.useCallback(async () => {
        let data = (await api.fetchDataFromGetApi('fastci/api/pipeline_list'))['results'];

        if (data === null) {
            // TODO: Make a toast
            console.log('Failed to refresh pipeline list!');
            return;
        }

        // @Speed - copying this each time just doesn't feel right
        let dataWithJobsTransformed = data.map((pipeline, i) => transformToJobsDict(pipeline));
        setData(dataWithJobsTransformed);
    }, []);

    useWebsocketScheduler(refreshList);

    // `bind` prepends any additional arguments, so these identification args must precede `event`
    function toggleDropdown(pipelineId, stageIndex, event) {
        // TODO: might be useful if I add hideDropdown, which isn't used yet
        // event.stopPropagation();

        // TODO: is this needed?
        event.preventDefault();

        if (openDropdownState.pipelineId === pipelineId &&
            openDropdownState.stageIndex === stageIndex) {
            setOpenDropdownState({pipelineId: null, stageIndex: null});
        } else {
            setOpenDropdownState({pipelineId, stageIndex});
        }
    }

    // TODO: Not sure how to use this yet. I can place this in the top-level container, but then
    //       I'll need to carefully handle event propagation
    // function hideDropdown(event) {
    //     // TODO: is this needed?
    //     event.preventDefault();
    //
    //     this.setState({
    //         pipelineIdDropdownOpen: null,
    //         stageIndexDropdownOpen: null
    //     });
    // }

    function makePipelineElement(pipeline, index) {
        const statusDescription = status.PIPELINE_STATUS_DESCRIPTION[pipeline.status];
        const statusClass = status.getPipelineStatusClass(pipeline.status);

        // @Speed - inefficient - copying and recalculating this here
        const stages = topologicalSort(transformToChildrenGraph(pipeline.jobs));
        const stagesElements = stages.map((stage, i) => {
            const jobsElements = stage.map((job, i) => {
                return <JobLink job={job} key={i}/>
            });
            const statusClass = status.getStageStatusClass(stage);

            return (
                <div className='pipeline_list_dropdown_container' key={i}>
                    <button
                        className={statusClass}
                        onClick={toggleDropdown.bind(null, pipeline.id, i)}>
                        {`Stage ${i + 1}`}
                    </button>
                    {(openDropdownState.pipelineId === pipeline.id &&
                        openDropdownState.stageIndex === i) ?
                        <div>{jobsElements}</div> : null}
                </div>
            );
        });

        return (
            <tr key={index}>
                <td>
                    <Link to={`/pipeline/${pipeline.id}`}>{pipeline.id}</Link>
                </td>
                <td>
                    <Link to={`/pipeline/${pipeline.id}`}>{pipeline.name}</Link>
                </td>
                <td className={statusClass}>{statusDescription}</td>
                <td>
                    {/* TODO: deal with overflow */}
                    <div className='pipeline_list_stages_box'>
                        {stagesElements}
                    </div>
                </td>
                <td>
                    <ActionWithTooltip
                        onClick={updatePipeline.bind(null, pipeline.id)}
                        iconClass='fas fa-sync running'
                        actionName='Update'/>
                    <ActionWithTooltip
                        onClick={cancelPipeline.bind(null, pipeline.id)}
                        iconClass='fas fa-ban cancelled'
                        actionName='Cancel'/>
                </td>
            </tr>
        );
    }

    // TODO:
    //   1. paging
    //   2. search
    //   3. actions - start, restart
    //   4. uptime
    const elements = data.map(makePipelineElement);

    return (
        <RequiresLogin>
            <PipelineCreatePage/>
            <table className='simple_table'>
                <thead>
                <tr>
                    <th>Id</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Jobs</th>
                    <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {elements}
                </tbody>
            </table>
        </RequiresLogin>
    );
}
