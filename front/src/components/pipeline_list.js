import React from "react";
import * as api from "../utils/api";
import {topologicalSort, transformToChildrenGraph, transformToJobsDict} from "../utils/node";
import * as status from "../utils/status";
import {Link} from "react-router-dom";
import ActionWithTooltip from "./action_with_tooltip";
import {cancelPipeline, updatePipeline} from "../utils/action_api";
import RequiresLogin from "./requires_login";
import PipelineCreatePage from "./pipeline_create";
import JobLink from "./job_link";

export default class PipelineListPage extends React.Component {
    constructor(props) {
        super(props);
        // TODO: @Speed - redrawing **everything** on each button click is surely really
        //       inefficient
        //       also kinda ugly
        this.state = {
            data: [],
            pipelineIdDropdownOpen: null,
            stageIndexDropdownOpen: null
        };
    }

    static intervalId = null;

    async refreshList() {
        let data = await api.fetchDataFromApi('fastci/api/pipeline_list');

        if (data === null) {
            // TODO: Make a toast
            console.log('Failed to refresh pipeline list!');
            return;
        }

        // @Speed - copying this each time just doesn't feel right
        let dataWithJobsTransformed = data.map((pipeline, i) => transformToJobsDict(pipeline));
        this.setState({data: dataWithJobsTransformed});
    }

    async componentDidMount() {
        // NOTE: componentDidMount and componentWillUnmount are, strangely enough, executed
        //       concurrently. And we need setInterval to fire before clearInterval. But js doesn't
        //       have any locks, which is strange... So we need to rely on the fact that js is run
        //       in a single thread, that componentDidMount is scheduled before compontWillUnmount,
        //       js has cooperative concurrency (NOT SURE ABOUT THIS ONE) and that setInterval and
        //       such don't cause context switching. Another thing is that react is fucking
        //       retarted, no other way of saying it. State changes in componentDidMount are not
        //       visible in componentWillUnmount for some stupid fucking reason... Thus we need to
        //       use different storage for the interval id - static variables for example, because I
        //       don't give a shit and fuck js. Taking all of this into consideration, we can
        //       conclude that this code below is (hopefully) correct
        this.intervalId = setInterval(async () => await this.refreshList(), 1000);
        await this.refreshList()
    }

    componentWillUnmount() {
        clearInterval(this.intervalId);
    }

    // `bind` prepends any additional arguments, so these identification args must precede `event`
    toggleDropdown(pipelineId, stageIndex, event) {
        // TODO: might be useful if I add hideDropdown, which isn't used yet
        // event.stopPropagation();

        // TODO: is this needed?
        event.preventDefault();

        if (this.state.pipelineIdDropdownOpen === pipelineId &&
            this.state.stageIndexDropdownOpen === stageIndex) {
            this.setState({
                pipelineIdDropdownOpen: null,
                stageIndexDropdownOpen: null
            });
        } else {
            this.setState({
                pipelineIdDropdownOpen: pipelineId,
                stageIndexDropdownOpen: stageIndex
            });
        }
    }

    // TODO: Not sure how to use this yet. I can place this in the top-level container, but then
    //       I'll need to carefully handle event propagation
    hideDropdown(event) {
        // TODO: is this needed?
        event.preventDefault();

        this.setState({
            pipelineIdDropdownOpen: null,
            stageIndexDropdownOpen: null
        });
    }

    makePipelineElement(pipeline, index) {
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
                        onClick={this.toggleDropdown.bind(this, pipeline.id, i)}>
                        {`Stage ${i + 1}`}
                    </button>
                    {(this.state.pipelineIdDropdownOpen === pipeline.id &&
                        this.state.stageIndexDropdownOpen === i) ?
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
                        onClick={async (event) => {
                            await updatePipeline(pipeline.id);
                            await this.refreshList();
                        }}
                        iconClass='fas fa-sync running'
                        actionName='Update'/>
                    <ActionWithTooltip
                        onClick={async (event) => {
                            await cancelPipeline(pipeline.id);
                            await this.refreshList();
                        }} iconClass='fas fa-ban cancelled'
                        actionName='Cancel'/>
                </td>
            </tr>
        );
    }

    render() {
        // TODO:
        //   1. paging
        //   2. search
        //   3. actions - update, start, restart
        //   4. uptime
        //   5. show status of individual stages and also steps in each stage
        const elements = this.state.data.reverse().map(this.makePipelineElement.bind(this));

        return (
            <RequiresLogin>
                <PipelineCreatePage refreshList={this.refreshList.bind(this)}/>
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
}

